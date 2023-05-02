/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { bootstrapTestApp } from '../test/test-app';
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
  const tags = [{ name: 'version', value: '1.0.0' }];
  const timestamp = new Date();

  return [{ fields, measurement, tags, timestamp }];
}

describe('TelemetryController', () => {
  let app: INestApplication;
  let influxDbService: InfluxDbService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    influxDbService = app.get(InfluxDbService);
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
          .mockImplementation(jest.fn());
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
        writePoints.mockReset();
      });
    });

    describe('with valid arguments', () => {
      it('writes the point to InfluxDB', async () => {
        const writePoints = jest
          .spyOn(influxDbService, 'writePoints')
          .mockImplementation(jest.fn());

        const points = mockTelemetryPoints();

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(2);
        expect(writePoints).toHaveBeenCalledWith(points);

        writePoints.mockReset();
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
          .mockImplementation(jest.fn());

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(2);
        expect(writePoints).not.toHaveBeenCalledWith(points);
        points[0].fields.splice(1, 1);
        expect(writePoints).toHaveBeenCalledWith(points);

        writePoints.mockReset();
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
          .mockImplementation(jest.fn());

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

        expect(writePoints).toHaveBeenCalledTimes(3);
        expect(writePoints).toHaveBeenCalledWith(points);

        writePoints.mockReset();
      });
    });
  });
});
