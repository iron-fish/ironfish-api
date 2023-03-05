/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import axios from 'axios';
import { bootstrapTestApp } from '../test/test-app';
import { JumioApiService } from './jumio-api.service';

describe('JumioApiService', () => {
  let app: INestApplication;
  let jumioApiService: JumioApiService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    jumioApiService = app.get(JumioApiService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const axiosMock = (method: 'post' | 'put' = 'post') => {
    return jest.spyOn(axios, method).mockResolvedValueOnce({
      data: {
        account: { id: 1 },
        workflowExecution: { id: 1 },
        web: { href: 'http://test.jumio.com/token' },
      },
    });
  };

  describe('createAccountAndTransaction', () => {
    describe('when calling jumio', () => {
      it('creates account when jumioAccountId is not present', async () => {
        const postMock = axiosMock();
        await jumioApiService.createAccountAndTransaction(123, null);

        expect(postMock).toHaveBeenCalledWith(
          'https://account.amer-1.jumio.ai/api/v1/accounts',
          expect.objectContaining({
            callbackUrl: expect.any(String),
            customerInternalReference: expect.any(Number),
            userReference: expect.any(String),
            workflowDefinition: expect.objectContaining({
              key: expect.any(Number),
              capabilities: {
                watchlistScreening: expect.objectContaining({
                  additionalProperties: '',
                }),
              },
            }),
          }),
          {
            headers: expect.objectContaining({
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: expect.stringContaining('Basic '),
              'User-Agent': 'IronFish Website/v1.0',
            }),
          },
        );
      });

      it('updates existing account when jumioAccountId is present', async () => {
        const postMock = axiosMock('put');

        await jumioApiService.createAccountAndTransaction(123, 'fooaccount');

        expect(postMock).toHaveBeenCalledWith(
          'https://account.amer-1.jumio.ai/api/v1/accounts/fooaccount',
          expect.objectContaining({
            callbackUrl: expect.any(String),
            customerInternalReference: expect.any(Number),
            userReference: expect.any(String),
            workflowDefinition: {
              key: expect.any(Number),
              capabilities: {
                watchlistScreening: expect.objectContaining({
                  additionalProperties: '',
                }),
              },
            },
          }),
          {
            headers: expect.objectContaining({
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: expect.stringContaining('Basic '),
              'User-Agent': 'IronFish Website/v1.0',
            }),
          },
        );
      });
    });
  });
});
