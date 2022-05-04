/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { ulid } from 'ulid';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';
import { FaucetTransactionsService } from './faucet-transactions.service';

describe('FaucetTransactionsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let faucetTransactionsService: FaucetTransactionsService;

  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    faucetTransactionsService = app.get(FaucetTransactionsService);
    API_KEY = config.get<string>('IRONFISH_API_KEY');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /faucet_transactions', () => {
    describe('with DISABLE_FAUCET set', () => {
      it('returns a 403', async () => {
        jest.spyOn(config, 'get').mockImplementationOnce(() => true);
        const { body } = await request(app.getHttpServer())
          .post('/faucet_transactions')
          .send({ email: faker.internet.email(), public_key: ulid() })
          .expect(HttpStatus.FORBIDDEN);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/faucet_transactions')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with empty arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/faucet_transactions')
          .send({ email: '', public_key: '' })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with valid arguments', () => {
      it('creates a Faucet Transaction', async () => {
        const publicKey = ulid();
        const { body } = await request(app.getHttpServer())
          .post('/faucet_transactions')
          .send({ email: faker.internet.email(), public_key: publicKey })
          .expect(HttpStatus.CREATED);

        expect(body).toMatchObject({
          object: 'faucet_transaction',
          id: expect.any(Number),
          public_key: publicKey,
        });
      });
    });
  });

  describe('GET /faucet_transactions/next', () => {
    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/faucet_transactions/next')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('when no next FaucetTransaction is available', () => {
      it('returns an empty list', async () => {
        jest.spyOn(faucetTransactionsService, 'next').mockResolvedValueOnce([]);

        const { body } = await request(app.getHttpServer())
          .get('/faucet_transactions/next')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.OK);

        const { data } = body;
        expect(data).toMatchObject([]);
      });
    });

    describe('when there is a pending FaucetTransaction', () => {
      it('returns the record', async () => {
        jest.spyOn(faucetTransactionsService, 'next').mockResolvedValueOnce([
          {
            id: 0,
            created_at: new Date(),
            updated_at: new Date(),
            public_key: 'mock-key',
            email: null,
            completed_at: null,
            started_at: null,
            tries: 0,
            hash: null,
          },
        ]);

        const { body } = await request(app.getHttpServer())
          .get('/faucet_transactions/next')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.OK);

        const { data } = body;
        expect(data as unknown[]).toMatchObject([
          {
            object: 'faucet_transaction',
            id: expect.any(Number),
            public_key: expect.any(String),
            completed_at: null,
          },
        ]);
      });
    });

    describe('when multiple FaucetTransactions are requested', () => {
      it('returns the records', async () => {
        jest.spyOn(faucetTransactionsService, 'next').mockResolvedValueOnce([
          {
            id: 0,
            created_at: new Date(),
            updated_at: new Date(),
            public_key: 'mock-key',
            email: null,
            completed_at: null,
            started_at: null,
            tries: 0,
            hash: null,
          },
          {
            id: 1,
            created_at: new Date(),
            updated_at: new Date(),
            public_key: 'mock-key',
            email: null,
            completed_at: null,
            started_at: null,
            tries: 0,
            hash: null,
          },
        ]);

        const { body } = await request(app.getHttpServer())
          .get('/faucet_transactions/next')
          .set('Authorization', `Bearer ${API_KEY}`)
          .query({ count: 2 })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect(data as unknown[]).toMatchObject([
          {
            object: 'faucet_transaction',
            id: expect.any(Number),
            public_key: expect.any(String),
            completed_at: null,
          },
          {
            object: 'faucet_transaction',
            id: expect.any(Number),
            public_key: expect.any(String),
            completed_at: null,
          },
        ]);
      });
    });
  });

  describe('GET /faucet_transactions/status', () => {
    it('returns the counts of states of Faucet Transactions', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/faucet_transactions/status')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        completed: expect.any(Number),
        running: expect.any(Number),
        pending: expect.any(Number),
      });
    });
  });

  describe('GET /faucet_transactions/:id', () => {
    describe('with an invalid id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get('/faucet_transactions/100000')
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid id', () => {
      it('returns the record', async () => {
        const email = faker.internet.email();
        const publicKey = ulid();
        const faucetTransaction = await faucetTransactionsService.create({
          email,
          publicKey,
        });

        const { body } = await request(app.getHttpServer())
          .get(`/faucet_transactions/${faucetTransaction.id}`)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'faucet_transaction',
          id: faucetTransaction.id,
          public_key: publicKey,
        });
      });
    });
  });

  describe('POST /faucet_transactions/:id/start', () => {
    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/faucet_transactions/0/start')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with an invalid id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .post('/faucet_transactions/100000/start')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid id', () => {
      it('starts the FaucetTransaction', async () => {
        const email = faker.internet.email();
        const publicKey = ulid();
        const faucetTransaction = await faucetTransactionsService.create({
          email,
          publicKey,
        });

        const { body } = await request(app.getHttpServer())
          .post(`/faucet_transactions/${faucetTransaction.id}/start`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'faucet_transaction',
          id: faucetTransaction.id,
          started_at: expect.any(String),
        });
      });
    });
  });

  describe('POST /faucet_transactions/:id/complete', () => {
    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/faucet_transactions/0/complete')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with an invalid id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .post('/faucet_transactions/100000/complete')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid id', () => {
      it('starts the FaucetTransaction', async () => {
        const email = faker.internet.email();
        const publicKey = ulid();
        const faucetTransaction = await faucetTransactionsService.create({
          email,
          publicKey,
        });
        await faucetTransactionsService.start(faucetTransaction);

        const hash = ulid();
        const { body } = await request(app.getHttpServer())
          .post(`/faucet_transactions/${faucetTransaction.id}/complete`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ hash })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'faucet_transaction',
          id: faucetTransaction.id,
          hash,
          completed_at: expect.any(String),
          started_at: expect.any(String),
        });
      });
    });
  });
});
