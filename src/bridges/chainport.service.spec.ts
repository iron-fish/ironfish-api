/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { ApiConfigService } from '../api-config/api-config.service';
import { NATIVE_ASSET_ID } from '../common/constants';
import { bootstrapTestApp } from '../test/test-app';
import { ChainportService } from './chainport.service';

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('ChainportService', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let chainport: ChainportService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    chainport = app.get(ChainportService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('getVerifiedTokens', () => {
    it('works with v1', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 1;
        }
        if (val === 'CHAINPORT_API_URL') {
          return 'https://api.chainport.io/';
        }
        return originalGet(val);
      });
      const results = await chainport.getVerifiedTokens();

      expect(results.length).toBeGreaterThan(0);
    }, 10000);

    it('works with v2', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 2;
        }
        return originalGet(val);
      });
      const results = await chainport.getVerifiedTokens();

      expect(results.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('getTokenPaths', () => {
    it('works with v1', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 1;
        }
        if (val === 'CHAINPORT_API_URL') {
          return 'https://api.chainport.io/';
        }
        return originalGet(val);
      });
      const results = await chainport.getTokenPaths(2804);

      expect(results.length).toBeGreaterThan(0);
    }, 10000);

    it('works with v2', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 2;
        }
        return originalGet(val);
      });
      const results = await chainport.getTokenPaths(87);

      expect(results.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('getIronFishMetadata', () => {
    it('works with v1', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 2;
        }
        if (val === 'CHAINPORT_API_URL') {
          return 'https://api.chainport.io/';
        }
        return originalGet(val);
      });
      const results = await chainport.getIronFishMetadata(
        100n,
        '2cabe0bddf475a478f4b3903f8fc2d2c70b52526f991bacea8267793da63f44b',
        1,
        '0xF1d90Af0D4638cD947971d858053696DC72bd241',
      );

      expect(results).not.toBeNull();
    }, 20000);

    it('works with v2', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 2;
        }
        return originalGet(val);
      });
      const results = await chainport.getIronFishMetadata(
        100n,
        NATIVE_ASSET_ID,
        15,
        '0xF1d90Af0D4638cD947971d858053696DC72bd241',
      );

      expect(results).not.toBeNull();
    }, 20000);
  });

  describe('getPort', () => {
    it('works with v1', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 1;
        }
        if (val === 'CHAINPORT_API_URL') {
          return 'https://api.chainport.io/';
        }
        return originalGet(val);
      });
      const results = await chainport.getPort(
        '620fbf3da89892b56e95dd9ffd69040c601d1b65d1df24b41162cedcbd7a7ae0',
        22,
      );

      expect(results.base_tx_hash).toBe(
        '620fbf3da89892b56e95dd9ffd69040c601d1b65d1df24b41162cedcbd7a7ae0',
      );
    }, 20000);

    it('works with v2', async () => {
      const originalGet = config.get.bind(config);
      jest.spyOn(config, 'get').mockImplementation((val) => {
        if (val === 'CHAINPORT_API_VERSION') {
          return 2;
        }
        return originalGet(val);
      });
      const results = await chainport.getPort(
        'e465f2c66cffd975b970e7dd940bbd7c5dfbd2f26b29690c29bdeb0cab818cbc',
        22,
      );

      expect(results.base_tx_hash).toBe(
        'e465f2c66cffd975b970e7dd940bbd7c5dfbd2f26b29690c29bdeb0cab818cbc',
      );
    }, 20000);
  });
});
