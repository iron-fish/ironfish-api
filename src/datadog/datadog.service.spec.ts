/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { StatsD } from 'hot-shots';
import { bootstrapTestApp } from '../test/test-app';
import { DatadogService } from './datadog.service';

describe('DatadogService', () => {
  let app: INestApplication;
  let datadogService: DatadogService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    datadogService = app.get(DatadogService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('timing', () => {
    it('calls `timing` on the client', () => {
      const timing = jest
        .spyOn(StatsD.prototype, 'timing')
        .mockImplementationOnce(jest.fn());
      const stat = 'ironfish.test';
      const value = 1;
      const tags = { foo: 'bar ' };

      datadogService.timing(stat, value, tags);

      expect(timing).toHaveBeenCalledWith(stat, value, tags);
    });
  });

  describe('increment', () => {
    it('calls `increment` on the client', () => {
      const increment = jest
        .spyOn(StatsD.prototype, 'increment')
        .mockImplementationOnce(jest.fn());
      const stat = 'ironfish.test';
      const value = 1;
      const tags = { foo: 'bar ' };

      datadogService.increment(stat, value, tags);

      expect(increment).toHaveBeenCalledWith(stat, value, tags);
    });
  });
});
