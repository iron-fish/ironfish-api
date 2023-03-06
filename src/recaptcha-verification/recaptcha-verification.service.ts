/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ApiConfigService } from '../api-config/api-config.service';

@Injectable()
export class RecaptchaVerificationService {
  constructor(private readonly configService: ApiConfigService) {}

  async verify(
    recaptcha: string,
    remoteIp: string,
    action: string,
  ): Promise<boolean> {
    const recaptchaSecret = this.configService.get<string>(
      'RECAPTCHA_SECRET_KEY',
    );

    const recaptchaBaseUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const recaptchaVerificationUrl = `${recaptchaBaseUrl}?secret=${recaptchaSecret}&response=${recaptcha}&remoteip=${remoteIp}`;

    try {
      const response =
        await axios.post<GoogleRecaptchaVerificationJsonResponse>(
          recaptchaVerificationUrl,
        );

      const verified =
        response.data.success &&
        response.data.action === action &&
        response.data.score >= 0.5;

      return verified;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          `Error verifying recaptcha: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw error;
      }
    }
  }
}

/**
 * Response object for the Google ReCAPTCHA verification API.
 *
 * @see https://developers.google.com/recaptcha/docs/verify
 */
type GoogleRecaptchaVerificationJsonResponse = {
  success: boolean;
  challenge_ts: string;
  action: string;
  hostname: string;
  score: number;
  'error-codes': string[];
};
