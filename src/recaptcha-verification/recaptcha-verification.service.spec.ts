/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import axios from 'axios';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';
import { RecaptchaVerificationService } from './recaptcha-verification.service';

describe('RecaptchaVerificationService', () => {
  let app: INestApplication;
  let recaptchaVerificationService: RecaptchaVerificationService;
  let configService: ApiConfigService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    recaptchaVerificationService = app.get(RecaptchaVerificationService);
    configService = app.get(ApiConfigService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('verify', () => {
    it('should return true if the recaptcha verification is successful', async () => {
      const mockedPost = jest.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          challenge_ts: '2023-02-08T17:44:20Z',
          score: 0.9,
          hostname: 'localhost',
        },
      });

      const recaptchaToken = 'token';
      const remoteIp = 'localhost';
      const recaptchaSecret = configService.get<string>('RECAPTCHA_SECRET_KEY');

      const response = await recaptchaVerificationService.verify(
        recaptchaToken,
        remoteIp,
      );

      const expectedUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}&remoteip=${remoteIp}`;

      expect(mockedPost).toHaveBeenCalledWith(expectedUrl);
      expect(response).toBe(true);
    });
  });
});
