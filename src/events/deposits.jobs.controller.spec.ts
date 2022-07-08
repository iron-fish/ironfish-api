/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { BlockOperation } from '../blocks/enums/block-operation';
import { ORE_TO_IRON } from '../common/constants';
import { bootstrapTestApp } from '../test/test-app';
import { DepositsJobsController } from './deposits.jobs.controller';
import { DepositsUpsertService } from './deposits.upsert.service';
import {
  DepositTransactionDto,
  UpsertDepositsNoteDto,
  UpsertDepositsOperationDto,
} from './dto/upsert-deposit.dto';

describe('DepositsJobsController', () => {
  let app: INestApplication;
  let depositsJobsController: DepositsJobsController;
  let depositsUpsertService: DepositsUpsertService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    depositsJobsController = app.get(DepositsJobsController);
    depositsUpsertService = app.get(DepositsUpsertService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

  describe('upsert', () => {
    it('upserts the deposit using the service', async () => {
      const upsert = jest
        .spyOn(depositsUpsertService, 'upsert')
        .mockImplementationOnce(jest.fn());
      const options = depositOperation(
        [transaction([...notes([1, 2], uuid())])],
        BlockOperation.CONNECTED,
        uuid(),
        uuid(),
        1,
      );

      await depositsJobsController.upsert(options);
      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert).toHaveBeenCalledWith(options);
    });

    it('does not requeue', async () => {
      jest
        .spyOn(depositsUpsertService, 'upsert')
        .mockImplementationOnce(jest.fn());
      const options = depositOperation(
        [transaction([...notes([1, 2], uuid())])],
        BlockOperation.CONNECTED,
        uuid(),
        uuid(),
        1,
      );

      const { requeue } = await depositsJobsController.upsert(options);
      expect(requeue).toBe(false);
    });
  });

  describe('refreshDeposits', () => {
    it('fixes mismatched deposits using the service', async () => {
      const refreshDeposits = jest
        .spyOn(depositsUpsertService, 'refreshDeposits')
        .mockImplementationOnce(jest.fn());

      await depositsJobsController.refreshDeposits();
      expect(refreshDeposits).toHaveBeenCalledTimes(1);
    });

    it('does not requeue', async () => {
      jest
        .spyOn(depositsUpsertService, 'refreshDeposits')
        .mockImplementationOnce(jest.fn());

      const { requeue } = await depositsJobsController.refreshDeposits();
      expect(requeue).toBe(false);
    });
  });
});
