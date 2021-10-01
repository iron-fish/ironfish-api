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
  let faucetTransactionsService: FaucetTransactionsService;

  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    faucetTransactionsService = app.get(FaucetTransactionsService);
    API_KEY = app.get(ApiConfigService).get<string>('IRONFISH_API_KEY');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /faucet_transactions', () => {
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
          .get(`/faucet_transactions/next`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('when no next FaucetTransaction is available', () => {
      it('returns a 404', async () => {
        jest
          .spyOn(faucetTransactionsService, 'next')
          .mockResolvedValueOnce(null);

        await request(app.getHttpServer())
          .get('/faucet_transactions/next')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('when there is a pending FaucetTransaction', () => {
      it('returns the record', async () => {
        jest.spyOn(faucetTransactionsService, 'next').mockResolvedValueOnce({
          id: 0,
          created_at: new Date(),
          updated_at: new Date(),
          public_key: 'mock-key',
          email: null,
          completed_at: null,
          started_at: null,
        });

        const { body } = await request(app.getHttpServer())
          .get('/faucet_transactions/next')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'faucet_transaction',
          id: expect.any(Number),
          public_key: expect.any(String),
        });
      });
    });
  });
});
