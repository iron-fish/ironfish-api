/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { ORE_TO_IRON } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import {
  DepositTransactionDto,
  UpsertDepositsDto,
  UpsertDepositsNoteDto,
  UpsertDepositsOperationDto,
} from './dto/upsert-deposit.dto';

describe('DepositsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let prisma: PrismaService;
  let users: UsersService;
  let user1: User;
  let user2: User;
  let transaction1: DepositTransactionDto;
  let transaction2: DepositTransactionDto;
  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    prisma = app.get(PrismaService);
    users = app.get(UsersService);
    API_KEY = config.get<string>('IRONFISH_API_KEY');
    await app.init();

    user1 = await users.create({
      email: faker.internet.email(),
      graffiti: 'user1',
      country_code: faker.address.countryCode(),
    });

    user2 = await users.create({
      email: faker.internet.email(),
      graffiti: 'user2',
      country_code: faker.address.countryCode(),
    });

    transaction1 = transaction(
      [...notes([1, 2], user1.graffiti), ...notes([0.1, 3], user2.graffiti)],
      'transaction1Hash',
    );

    transaction2 = transaction(
      [...notes([0.05], user1.graffiti), ...notes([1], user2.graffiti)],
      'transaction2Hash',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /deposits/head', () => {
    const block1Hash = uuid();
    const block2Hash = uuid();

    it('returns the latest deposit submitted', async () => {
      const payload: UpsertDepositsDto = {
        operations: [
          depositOperation(
            [transaction([...notes([1, 2], uuid())])],
            BlockOperation.CONNECTED,
            block1Hash,
            uuid(),
            1,
          ),
          depositOperation(
            [transaction([...notes([1, 2], uuid())])],
            BlockOperation.CONNECTED,
            block2Hash,
            block1Hash,
            2,
          ),
        ],
      };

      await request(app.getHttpServer())
        .post(`/deposits`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.block_hash).toEqual(block2Hash);
    });

    it('returns the latest deposit if a block is disconnected', async () => {
      const payload: UpsertDepositsDto = {
        operations: [
          depositOperation(
            [transaction([...notes([1, 2], uuid())])],
            BlockOperation.DISCONNECTED,
            block2Hash,
            block1Hash,
            2,
          ),
        ],
      };

      await request(app.getHttpServer())
        .post(`/deposits`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

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
        .expect(HttpStatus.CREATED);

      const user1Events = await prisma.event.findMany({
        where: {
          user_id: user1.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      const user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(2);

      const user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      const user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);

      expect(user1Events[0].deposit_id).toEqual(user1Deposits[0].id);
      expect(user2Events[0].deposit_id).toEqual(user2Deposits[0].id);
      expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
    });

    it('removes events on DISCONNECTED operation', async () => {
      const payload: UpsertDepositsDto = {
        operations: [
          depositOperation(
            [transaction2],
            BlockOperation.DISCONNECTED,
            'block1Hash',
          ),
        ],
      };

      await request(app.getHttpServer())
        .post(`/deposits`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      const user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      const user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      const user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user2Events[0].points).toBe(1);
      expect(user2Events[1].points).toBe(0);
      expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
      expect(user2Deposits[1].amount).toEqual(1 * ORE_TO_IRON);

      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);

      expect(user1Deposits[1].main).toBe(false);
      expect(user2Deposits[1].main).toBe(false);
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
});
