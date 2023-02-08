/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { NodeUptimesService } from '../node-uptimes/node-uptimes.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { VersionsService } from '../versions/versions.service';
import { BLOCK_PROPAGATION_INTERVAL } from './telemetry.controller';

function mockTelemetryPoints() {
  const fields = [
    {
      name: 'online',
      type: 'boolean',
      value: true,
    },
    {
      name: 'memory',
      type: 'float',
      value: 1.23,
    },
    {
      name: 'mempool',
      type: 'integer',
      value: 1,
    },
    {
      name: 'name',
      type: 'string',
      value: 'howdy',
    },
  ];
  const measurement = 'node_started';
  const tags = [{ name: 'version', value: '0.1.24' }];
  const timestamp = new Date();

  return [{ fields, measurement, tags, timestamp }];
}

describe('TelemetryController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let graphileWorkerService: GraphileWorkerService;
  let influxDbService: InfluxDbService;
  let nodeUptimesService: NodeUptimesService;
  let prisma: PrismaService;
  let usersService: UsersService;
  let versionsService: VersionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    graphileWorkerService = app.get(GraphileWorkerService);
    influxDbService = app.get(InfluxDbService);
    nodeUptimesService = app.get(NodeUptimesService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    versionsService = app.get(VersionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /telemetry', () => {
    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/telemetry')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with empty or invalid arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/telemetry')
          .send({
            points: [
              {
                fields: [
                  {
                    name: 'foo',
                    type: 'missing-type',
                    value: 'howdy',
                  },
                  {
                    name: 'foo',
                    type: 'boolean',
                  },
                  {
                    name: 'foo',
                    type: 'float',
                    value: 'ironfish',
                  },
                  {
                    name: 'foo',
                    type: 'integer',
                    value: 'hello',
                  },
                  {
                    name: 'foo',
                    type: 'string',
                    value: 123,
                  },
                ],
                measurement: '',
                tags: [{ foo: 'bar' }],
                value: -1,
              },
            ],
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a version lower than the minimum telemetry version', () => {
      it('does not write the points to InfluxDB', async () => {
        const writePoints = jest
          .spyOn(influxDbService, 'writePoints')
          .mockImplementationOnce(jest.fn());
        const fields = [
          {
            name: 'online',
            type: 'boolean',
            value: true,
          },
          {
            name: 'memory',
            type: 'float',
            value: 1.23,
          },
          {
            name: 'mempool',
            type: 'integer',
            value: 1,
          },
          {
            name: 'name',
            type: 'string',
            value: 'howdy',
          },
        ];
        const measurement = 'node';
        const tags = [{ name: 'version', value: '0.0.0' }];

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({
            points: [{ fields, measurement, tags, timestamp: new Date() }],
          })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(0);
      });
    });

    describe('with valid arguments', () => {
      it('writes the point to InfluxDB', async () => {
        const writePoints = jest
          .spyOn(influxDbService, 'writePoints')
          .mockImplementationOnce(jest.fn());

        const points = mockTelemetryPoints();

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(2);
        expect(writePoints).toHaveBeenCalledWith(points);
      });

      it('filters points to InfluxDB', async () => {
        const points = mockTelemetryPoints();
        points[0].measurement = 'node_stats';
        points[0].fields = [
          {
            name: 'heap_used',
            type: 'integer',
            value: 1,
          },
          {
            name: 'foobarbaz',
            type: 'integer',
            value: 2,
          },
        ];

        const writePoints = jest
          .spyOn(influxDbService, 'writePoints')
          .mockImplementationOnce(jest.fn());

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(2);
        expect(writePoints).not.toHaveBeenCalledWith(points);
        points[0].fields.splice(1, 1);
        expect(writePoints).toHaveBeenCalledWith(points);
      });

      it('filters some blocks', async () => {
        const points = mockTelemetryPoints();
        points[0].measurement = 'block_propagation';
        points[0].fields = [
          {
            name: 'sequence',
            type: 'integer',
            value: BLOCK_PROPAGATION_INTERVAL + 1,
          },
        ];

        const writePoints = jest
          .spyOn(influxDbService, 'writePoints')
          .mockImplementationOnce(jest.fn());

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(1);
        expect(writePoints).not.toHaveBeenCalledWith(points);

        points[0].fields[0].value = BLOCK_PROPAGATION_INTERVAL;

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(1);
        expect(writePoints).toHaveBeenCalledWith(points);
      });

      describe('when `ALLOW_NODE_UPTIME_POINTS` is true', () => {
        it('updates the node uptime', async () => {
          jest
            .spyOn(influxDbService, 'writePoints')
            .mockImplementationOnce(jest.fn());

          const nodeUptimeUpsert = jest
            .spyOn(nodeUptimesService, 'addUptime')
            .mockImplementationOnce(jest.fn());

          jest.spyOn(versionsService, 'getLatestAtDate').mockResolvedValue({
            id: 1,
            version: '0.1.24',
            created_at: new Date(),
          });

          const graffiti = uuid();
          const user = await usersService.create({
            email: faker.internet.email(),
            graffiti,
            countryCode: faker.address.countryCode(),
          });

          const points = mockTelemetryPoints();

          await request(app.getHttpServer())
            .post('/telemetry')
            .send({ points, graffiti })
            .expect(HttpStatus.CREATED);

          expect(nodeUptimeUpsert).toHaveBeenCalledTimes(1);
          expect(nodeUptimeUpsert).toHaveBeenCalledWith(user);
        });

        it('updates the node uptime if the api returns no version', async () => {
          jest
            .spyOn(influxDbService, 'writePoints')
            .mockImplementationOnce(jest.fn());

          const nodeUptimeUpsert = jest
            .spyOn(nodeUptimesService, 'addUptime')
            .mockImplementationOnce(jest.fn());

          const graffiti = uuid();
          const user = await usersService.create({
            email: faker.internet.email(),
            graffiti,
            countryCode: faker.address.countryCode(),
          });

          const points = mockTelemetryPoints();

          await request(app.getHttpServer())
            .post('/telemetry')
            .send({ points, graffiti })
            .expect(HttpStatus.CREATED);

          expect(nodeUptimeUpsert).toHaveBeenCalledTimes(1);
          expect(nodeUptimeUpsert).toHaveBeenCalledWith(user);
        });

        it('updates users points when user has logged enough hours', async () => {
          jest
            .spyOn(influxDbService, 'writePoints')
            .mockImplementationOnce(jest.fn());

          const workerAddJob = jest
            .spyOn(graphileWorkerService, 'addJob')
            .mockImplementationOnce(jest.fn());

          const oldCheckin = new Date();
          oldCheckin.setHours(oldCheckin.getHours() - 2);

          const user = await usersService.create({
            email: faker.internet.email(),
            graffiti: uuid(),
            countryCode: faker.address.countryCode(),
          });

          await prisma.nodeUptime.create({
            data: {
              user_id: user.id,
              total_hours: 12,
              last_checked_in: oldCheckin,
            },
          });

          const points = mockTelemetryPoints();

          await request(app.getHttpServer())
            .post('/telemetry')
            .send({ points, graffiti: user.graffiti })
            .expect(HttpStatus.CREATED);

          expect(workerAddJob).toHaveBeenCalledTimes(1);
          expect(workerAddJob).toHaveBeenCalledWith(
            GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT,
            { userId: user.id, occurredAt: expect.any(Date) },
            expect.anything(),
          );
        });

        it('does not update the node uptime if provided version is too old', async () => {
          jest
            .spyOn(influxDbService, 'writePoints')
            .mockImplementationOnce(jest.fn());

          const nodeUptimeUpsert = jest
            .spyOn(nodeUptimesService, 'addUptime')
            .mockImplementationOnce(jest.fn());

          jest.spyOn(versionsService, 'getLatestAtDate').mockResolvedValue({
            id: 1,
            version: '0.1.30',
            created_at: new Date(),
          });

          const graffiti = uuid();
          await usersService.create({
            email: faker.internet.email(),
            graffiti,
            countryCode: faker.address.countryCode(),
          });

          const points = mockTelemetryPoints();

          await request(app.getHttpServer())
            .post('/telemetry')
            .send({
              points,
              graffiti,
            })
            .expect(HttpStatus.CREATED);

          expect(nodeUptimeUpsert).toHaveBeenCalledTimes(0);
        });
      });

      describe('when `ALLOW_NODE_UPTIME_POINTS` is false', () => {
        it('does not add any uptime', async () => {
          jest.spyOn(config, 'get').mockImplementationOnce(() => false);

          const nodeUptimeUpsert = jest
            .spyOn(nodeUptimesService, 'addUptime')
            .mockImplementationOnce(jest.fn());

          const graffiti = uuid();
          await usersService.create({
            email: faker.internet.email(),
            graffiti,
            countryCode: faker.address.countryCode(),
          });

          await request(app.getHttpServer())
            .post('/telemetry')
            .send({ points: [], graffiti })
            .expect(HttpStatus.CREATED);

          expect(nodeUptimeUpsert).not.toHaveBeenCalled();
        });
      });
    });
  });
});
