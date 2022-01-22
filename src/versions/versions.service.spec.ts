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
        await versionsService.create('0.1.20');
        const version = await versionsService.create('0.1.21');
        expect(version).toMatchObject({
          id: expect.any(Number),
          created_at: expect.any(Date),
          version: '0.1.21',
        });
      });
    });
  });
});
