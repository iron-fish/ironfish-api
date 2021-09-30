/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { ulid } from 'ulid';
import { bootstrapTestApp } from '../test/test-app';
import { FaucetTransactionsService } from './faucet-transactions.service';

describe('FaucetTransactionService', () => {
  let app: INestApplication;
  let faucetTransactionsService: FaucetTransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    faucetTransactionsService = app.get(FaucetTransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('creates a FaucetTransaction record', async () => {
      const email = faker.internet.email();
      const publicKey = ulid();
      const faucetTransaction = await faucetTransactionsService.create({
        email,
        publicKey,
      });

      expect(faucetTransaction).toMatchObject({
        id: expect.any(Number),
        email,
        public_key: publicKey,
      });
    });
  });
});
