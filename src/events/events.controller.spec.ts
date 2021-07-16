/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { EventType } from '.prisma/client';

describe('EventsController', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /events/', () => {
    describe('with no filters', () => {
      it('returns a list of events', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/events`)
          .expect(HttpStatus.OK);

        expect((body as unknown[]).length).toBeGreaterThan(0);
        expect((body as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          account_id: expect.any(Number),
          type: expect.any(String),
        });
      });
    });

    describe('with an account filter', () => {
      it('returns events only for that account', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const firstEvent = await prisma.event.create({
          data: {
            type: EventType.BUG_CAUGHT,
            account_id: account.id,
            occurred_at: new Date(),
          },
        });
        const secondEvent = await prisma.event.create({
          data: {
            type: EventType.COMMUNITY_CONTRIBUTION,
            account_id: account.id,
            occurred_at: new Date(),
          },
        });
        const thirdEvent = await prisma.event.create({
          data: {
            type: EventType.SOCIAL_MEDIA_PROMOTION,
            account_id: account.id,
            occurred_at: new Date(),
          },
        });
        const events = [firstEvent, secondEvent, thirdEvent];

        const { body } = await request(app.getHttpServer())
          .get(`/events`)
          .query({ account_id: account.id })
          .expect(HttpStatus.OK);

        expect(body).toHaveLength(events.length);
        for (const event of body) {
          expect(event).toMatchObject({
            id: expect.any(Number),
            account_id: account.id,
            type: expect.any(String),
          });
        }
      });
    });
  });
});
