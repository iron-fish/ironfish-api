/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { ORE_TO_IRON } from '../common/constants';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { bootstrapTestApp } from '../test/test-app';
import { DepositsService } from './deposits.service';
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
  let depositsService: DepositsService;
  let graphileWorkerService: GraphileWorkerService;
  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    depositsUpsertsService = app.get(DepositsUpsertService);
    depositsService = app.get(DepositsService);
    graphileWorkerService = app.get(GraphileWorkerService);
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
    it('returns the latest deposit submitted', async () => {
      const head = await depositsService.head();
      const hash = uuid();

      await depositsUpsertsService.upsert(
        depositOperation([], BlockOperation.CONNECTED, hash, head?.block_hash),
      );

      const response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.block_hash).toEqual(hash);
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

      const payload: UpsertDepositsDto = {
        operations: [
          depositOperation([transaction(notes([1]))], BlockOperation.CONNECTED),
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

  const notes = (amounts: number[], graffiti?: string) => {
    const memo = graffiti ?? uuid();

    return amounts.map((amount) => {
      return { memo, amount: amount * ORE_TO_IRON };
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

  describe('POST /deposits/refresh', () => {
    it('enqueues a worker job to fix deposits', async () => {
      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementationOnce(jest.fn());

      await request(app.getHttpServer())
        .post('/deposits/refresh')
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.REFRESH_DEPOSITS,
      );
    });
  });

  describe('POST /deposits/sync_to_telemetry', () => {
    it('enqueues a worker to sync total iron to telemetry', async () => {
      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementationOnce(jest.fn());

      await request(app.getHttpServer())
        .post('/deposits/sync_to_telemetry')
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.SUBMIT_DEPOSITED_IRON_TO_TELEMETRY,
      );
    });
  });

  describe('GET /deposits/min_and_max_deposit_size', () => {
    it('retrieves min and max deposit size', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/deposits/min_and_max_deposit_size')
        .expect(HttpStatus.OK);

      const { min_deposit_size, max_deposit_size } = body;
      expect(min_deposit_size as string).toBe(config.get('MIN_DEPOSIT_SIZE'));
      expect(max_deposit_size as string).toBe(config.get('MAX_DEPOSIT_SIZE'));
    });
  });
});
