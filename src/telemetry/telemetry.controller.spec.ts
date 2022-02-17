/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { bootstrapTestApp } from '../test/test-app';

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
        const tags = [{ name: 'version', value: '0.1.23' }];
        const timestamp = new Date();

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ points: [{ fields, measurement, tags, timestamp }] })
          .expect(HttpStatus.CREATED);

        expect(writePoints).toHaveBeenCalledTimes(1);
        expect(writePoints).toHaveBeenCalledWith([
          {
            fields,
            measurement,
            tags,
            timestamp,
          },
        ]);
      });
    });
  });
});
