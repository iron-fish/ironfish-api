/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { RedemptionService } from './redemption.service';
import { serializeRedemption } from './utils/serialize-redemption';

describe('RedemptionsController', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let magicLinkService: MagicLinkService;
  let redemptionService: RedemptionService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    redemptionService = app.get(RedemptionService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const mockUser = async (): Promise<User> => {
    const user = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: faker.address.countryCode('alpha-3'),
    });
    jest
      .spyOn(magicLinkService, 'getEmailFromHeader')
      .mockImplementation(() => Promise.resolve(user.email));
    return user;
  };

  describe('POST /redemption', () => {
    it('creates new redemption when not created', async () => {
      const user = await mockUser();
      const { body } = await request(app.getHttpServer())
        .post(`/redemption`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.CREATED);
      const redemption = await redemptionService.find(user);
      if (!redemption) {
        throw Error('Should have been created by api');
      }
      expect(body).toMatchObject(serializeRedemption(redemption));
    });
    it('fails if user already has redemption', async () => {
      const user = await mockUser();
      // create redemption
      await redemptionService.getOrCreate(user, 'bar');
      await request(app.getHttpServer())
        .post(`/redemption`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
  });

  describe('GET /redemption', () => {
    it('retrieves redemption when it exists', async () => {
      const user = await mockUser();
      const redemption = await redemptionService.getOrCreate(
        user,
        'fakePublicAddress',
      );
      const { body } = await request(app.getHttpServer())
        .get(`/redemption`)
        .set('Authorization', 'did-token')
        .expect(HttpStatus.OK);
      expect(body).toMatchObject(serializeRedemption(redemption));
    });
    it('retrieves when redemption if already present', async () => {
      await mockUser();
      // no redemption created for user
      await request(app.getHttpServer())
        .get(`/redemption`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
