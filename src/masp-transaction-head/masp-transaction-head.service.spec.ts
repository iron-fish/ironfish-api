/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { MaspTransactionHeadService } from './masp-transaction-head.service';

describe('MaspTransactionHeadService', () => {
  let app: INestApplication;
  type NewType = MaspTransactionHeadService;

  let maspTransactionHeadService: NewType;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    maspTransactionHeadService = app.get(MaspTransactionHeadService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('upsert', () => {
    it('upserts a MaspTransactionHead record', async () => {
      const hash = uuid();
      const record = await maspTransactionHeadService.upsert(hash);
      expect(record).toMatchObject({
        id: 1,
        block_hash: hash,
      });
    });
  });
});
