/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import { DecisionLabel, DecisionStatus, User } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { JumioTransactionService } from './jumio-transaction.service';

describe('JumioTransactionService', () => {
  let app: INestApplication;
  let jumioTransactionService: JumioTransactionService;
  let usersService: UsersService;
  let prisma: PrismaService;
  let user: User;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    jumioTransactionService = app.get(JumioTransactionService);
    usersService = app.get(UsersService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findRecentOrThrow', () => {
    describe('with two records', () => {
      it('returns the newest', async () => {
        user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });
        await prisma.jumioTransaction.create({
          data: {
            user: { connect: { id: user.id } },
            workflow_execution_id: 'foo',
            web_href:
              'https://ironfish.web.amer-1.jumio.ai/web/v4/app?authorizationToken=eyJi0g&locale=en',
            decision_label: DecisionLabel.NOT_UPLOADED,
            decision_status: DecisionStatus.NOT_EXECUTED,
          },
        });
        const jumioTransaction2 = await prisma.jumioTransaction.create({
          data: {
            user: { connect: { id: user.id } },
            workflow_execution_id: 'bar',
            web_href:
              'https://ironfish.web.amer-1.jumio.ai/web/v4/app?authorizationToken=eyJi0222222222222g&locale=en',
            decision_label: DecisionLabel.NOT_UPLOADED,
            decision_status: DecisionStatus.NOT_EXECUTED,
          },
        });
        const foundJumioTransaction =
          await jumioTransactionService.findLatestOrThrow(user);
        expect(foundJumioTransaction.workflow_execution_id).toEqual(
          jumioTransaction2.workflow_execution_id,
        );
        expect(foundJumioTransaction.web_href).toEqual(
          jumioTransaction2.web_href,
        );
      });
    });

    describe('with no records', () => {
      it('throws a NotFoundException', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        await expect(
          jumioTransactionService.findLatestOrThrow(user),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
