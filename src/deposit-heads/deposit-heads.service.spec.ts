/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { DepositHeadsService } from './deposit-heads.service';

describe('DepositHeadsService', () => {
  let app: INestApplication;
  let depositHeadsService: DepositHeadsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    depositHeadsService = app.get(DepositHeadsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('upsert', () => {
    it('upserts a DepositHead record', async () => {
      const hash = uuid();
      const record = await depositHeadsService.upsert(hash);
      expect(record).toMatchObject({
        id: 1,
        block_hash: hash,
      });
    });
  });
});
