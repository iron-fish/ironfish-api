/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import { bootstrapTestApp } from '../test/test-app';
import { RecaptchaVerificationService } from './recaptcha-verification.service';

describe('RecaptchaVerificationService', () => {
  let app: INestApplication;
  let recaptchaVerificationService: RecaptchaVerificationService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    recaptchaVerificationService = app.get(RecaptchaVerificationService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('verify', () => {
    it('should return true if the recaptcha verification is successful', async () => {
      const verifyRecaptcha = jest.spyOn(
        recaptchaVerificationService,
        'verify',
      );
      const response = await recaptchaVerificationService.verify('token');
      expect(verifyRecaptcha).toHaveBeenCalled();
      assert.ok(verifyRecaptcha.mock.calls);
      expect(response).toBe(true);
    });
  });
});
