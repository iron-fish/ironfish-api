/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { CreateBlockDto } from './dto/create-block.dto';

const API_KEY = 'test';

describe('BlocksController', () => {
  let app: INestApplication;
  let config: ConfigService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ConfigService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /blocks', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid payload', () => {
      it('stores a block', async () => {
        const payload: CreateBlockDto = {
          hash: uuid(),
          difficulty: faker.datatype.number(),
          main: true,
          sequence: faker.datatype.number(),
          timestamp: new Date(),
          transactions_count: 0,
          previous_block_hash: uuid(),
        };
        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send(payload)
          .expect(HttpStatus.CREATED);

        expect(body).toMatchObject({
          id: expect.any(Number),
          hash: payload.hash,
          difficulty: payload.difficulty,
          main: payload.main,
          sequence: payload.sequence,
          timestamp: payload.timestamp.toISOString(),
          transactions_count: payload.transactions_count,
          previous_block_hash: payload.previous_block_hash,
        });
      });
    });
  });
});
