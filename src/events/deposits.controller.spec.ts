/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { ORE_TO_IRON } from '../common/constants';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { DepositsUpsertService } from './deposits.upsert.service';
import {
  DepositTransactionDto,
  UpsertDepositsDto,
  UpsertDepositsNoteDto,
  UpsertDepositsOperationDto,
} from './dto/upsert-deposit.dto';

describe('DepositsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let depositsUpsertsService: DepositsUpsertService;
  let graphileWorkerService: GraphileWorkerService;
  let usersService: UsersService;
  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    depositsUpsertsService = app.get(DepositsUpsertService);
    graphileWorkerService = app.get(GraphileWorkerService);
    usersService = app.get(UsersService);
    API_KEY = config.get<string>('IRONFISH_API_KEY');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(graphileWorkerService, 'addJob').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /deposits/head', () => {
    const block1Hash = uuid();
    const block2Hash = uuid();

    it('returns the latest deposit submitted', async () => {
      await depositsUpsertsService.upsert(
        depositOperation(
          [transaction([...notes([1, 2], uuid())])],
          BlockOperation.CONNECTED,
          block1Hash,
          uuid(),
          1,
        ),
      );
      await depositsUpsertsService.upsert(
        depositOperation(
          [transaction([...notes([1, 2], uuid())])],
          BlockOperation.CONNECTED,
          block2Hash,
          block1Hash,
          2,
        ),
      );

      const response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.block_hash).toEqual(block2Hash);
    });

    it('returns the latest deposit if a block is disconnected', async () => {
      await depositsUpsertsService.upsert(
        depositOperation(
          [transaction([...notes([1, 2], uuid())])],
          BlockOperation.DISCONNECTED,
          block2Hash,
          block1Hash,
          2,
        ),
      );

      const response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.block_hash).toEqual(block1Hash);
    });
  });

  describe('GET /deposits/address', () => {
    it('retuns deposit address from config', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/deposits/address')
        .expect(HttpStatus.OK);

      const { address } = body;
      expect(address as string).toBe(config.get('DEPOSIT_ADDRESS'));
    });
  });

  describe('POST /deposits', () => {
    it('upserts new deposit', async () => {
      const bulkUpsert = jest
        .spyOn(depositsUpsertsService, 'bulkUpsert')
        .mockImplementationOnce(jest.fn());

      const user1 = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode(),
      });
      const user2 = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode(),
      });
      const transaction1 = transaction(
        [...notes([1, 2], user1.graffiti), ...notes([0.1, 3], user2.graffiti)],
        'transaction1Hash',
      );
      const transaction2 = transaction(
        [...notes([0.05], user1.graffiti), ...notes([1], user2.graffiti)],
        'transaction2Hash',
      );

      const payload: UpsertDepositsDto = {
        operations: [
          depositOperation(
            [transaction1, transaction2],
            BlockOperation.CONNECTED,
            'block1Hash',
          ),
        ],
      };

      await request(app.getHttpServer())
        .post(`/deposits`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.ACCEPTED);

      expect(bulkUpsert).toHaveBeenCalledWith(payload.operations);
    });
  });

  const notes = (amounts: number[], graffiti: string) => {
    return amounts.map((amount) => {
      return { memo: graffiti, amount: amount * ORE_TO_IRON };
    });
  };

  const transaction = (notes: UpsertDepositsNoteDto[], hash?: string) => {
    return {
      hash: hash || uuid(),
      notes,
    };
  };

  const depositOperation = (
    transactions: DepositTransactionDto[],
    type: BlockOperation,
    hash?: string,
    previousBlockHash?: string,
    sequence?: number,
  ): UpsertDepositsOperationDto => {
    return {
      type,
      block: {
        hash: hash || uuid(),
        timestamp: new Date(),
        sequence: sequence || 0,
        previousBlockHash: previousBlockHash || uuid(),
      },
      transactions,
    };
  };

  describe('POST /deposits/fix_mismatches', () => {
    it('enqueues a worker job to fix deposits', async () => {
      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementationOnce(jest.fn());

      await request(app.getHttpServer())
        .post('/deposits/fix_mismatches')
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.FIX_MISMATCHED_DEPOSITS,
      );
    });
  });
});
