/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { ulid } from 'ulid';
import { bootstrapTestApp } from '../test/test-app';

describe('FaucetTransactionsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
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
});
