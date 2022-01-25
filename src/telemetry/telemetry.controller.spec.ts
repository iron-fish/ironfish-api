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
            measurement: '',
            name: '',
            tags: [{ foo: 'bar' }],
            value: -1,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with valid arguments', () => {
      it('writes the point to InfluxDB', async () => {
        const writePoint = jest
          .spyOn(influxDbService, 'writePoint')
          .mockImplementationOnce(jest.fn());
        const measurement = 'node';
        const name = 'memory';
        const tags = [{ name: 'user_agent', value: '0.0.0' }];
        const value = 1;

        await request(app.getHttpServer())
          .post('/telemetry')
          .send({ measurement, name, tags, value })
          .expect(HttpStatus.CREATED);

        expect(writePoint).toHaveBeenCalledTimes(1);
        expect(writePoint).toHaveBeenCalledWith({
          measurement,
          name,
          tags,
          timestamp: expect.any(Date),
          value,
        });
      });
    });
  });
});
