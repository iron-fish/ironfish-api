/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { MaspHeadService } from './masp-transaction-head.service';

describe('MaspHeadService', () => {
  let app: INestApplication;
  let maspHeadService: MaspHeadService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    maspHeadService = app.get(MaspHeadService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('upsert', () => {
    it('upserts a MaspTransactionHead record', async () => {
      const hash = uuid();
      const record = await maspHeadService.upsert(hash);
      expect(record).toMatchObject({
        id: 1,
        block_hash: hash,
      });
    });
  });
});
