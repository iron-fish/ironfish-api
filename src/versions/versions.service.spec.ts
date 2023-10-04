/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { VersionsService } from './versions.service';

describe('VersionsService', () => {
  let app: INestApplication;
  let versionsService: VersionsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    versionsService = app.get(VersionsService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.version.deleteMany();
  });

  describe('create', () => {
    it('creates and returns a version record', async () => {
      const version = await versionsService.create('0.1.20');
      expect(version).toMatchObject({
        id: expect.any(Number),
        created_at: expect.any(Date),
        version: '0.1.20',
      });
    });
  });

  describe('getLatest', () => {
    describe('with no records', () => {
      it('returns null', async () => {
        await prisma.version.deleteMany();
        const nullVersion = await versionsService.getLatest();
        expect(nullVersion).toBeNull();
      });
    });

    describe('with multiple records', () => {
      it('returns the latest version', async () => {
        await versionsService.create('0.1.21');
        const latestVersion = await versionsService.create('0.1.20');

        const version = await versionsService.getLatest();
        expect(version).toMatchObject(latestVersion);
      });
    });
  });

  describe('getLatestAtDate', () => {
    describe('with no records', () => {
      it('returns null', async () => {
        await prisma.version.deleteMany();
        const nullVersion = await versionsService.getLatestAtDate(new Date());
        expect(nullVersion).toBeNull();
      });
    });

    describe('with multiple records', () => {
      it('returns the latest version prior to the date provided', async () => {
        const date = new Date();
        date.setDate(date.getDate() - 7);

        const oldVersionDate = new Date();
        oldVersionDate.setDate(oldVersionDate.getDate() - 10);
        let oldVersion = await versionsService.create('0.1.20');
        oldVersion = await prisma.version.update({
          data: {
            created_at: oldVersionDate,
          },
          where: {
            id: oldVersion.id,
          },
        });

        await versionsService.create('0.1.21');

        const actualVersion = await versionsService.getLatestAtDate(date);
        expect(actualVersion).toMatchObject(oldVersion);
      });
    });
  });
});
