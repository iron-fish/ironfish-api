/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { InfluxDB } from '@influxdata/influxdb-client';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp } from '../test/test-app';
import { InfluxDbService } from './influxdb.service';
import { CreatePointOptions } from './interfaces/create-point-options';

describe('InfluxDbService', () => {
  let app: INestApplication;
  let influxDbService: InfluxDbService;

  const writePoints = jest.fn();

  beforeAll(async () => {
    jest
      .spyOn(InfluxDB.prototype, 'getWriteApi')
      .mockImplementationOnce(() => ({
        writePoints,
        useDefaultTags: jest.fn(),
        writeRecord: jest.fn(),
        writeRecords: jest.fn(),
        writePoint: jest.fn(),
        flush: jest.fn(),
        close: jest.fn(),
        dispose: jest.fn(),
      }));

    app = await bootstrapTestApp();
    influxDbService = app.get(InfluxDbService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('writePoint', () => {
    it('writes the data to InfluxDB', () => {
      const options: CreatePointOptions = {
        fields: [{ name: 'memory', type: 'float', value: 1 }],
        measurement: 'node',
        tags: [{ name: 'user_agent', value: '0.0.0' }],
        timestamp: Date.now(),
      };
      influxDbService.writePoints([options]);

      expect(writePoints).toHaveBeenCalled();
    });
  });
});
