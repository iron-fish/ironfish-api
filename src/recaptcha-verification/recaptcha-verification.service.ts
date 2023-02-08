/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ApiConfigService } from '../api-config/api-config.service';

@Injectable()
export class RecaptchaVerificationService {
  constructor(private readonly configService: ApiConfigService) {}

  async verify(recaptcha?: string | undefined): Promise<boolean> {
    if (recaptcha === undefined) {
      throw new HttpException(
        "Missing 'recaptcha' field",
        HttpStatus.BAD_REQUEST,
      );
    }

    const recaptchaSecret = this.configService.get<string>(
      'RECAPTCHA_SECRET_KEY',
    );

    const recaptchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptcha}`;

    const isVerified = await fetch(recaptchaVerificationUrl)
      .then((response) => response.json())
      .then(
        (response: {
          success: boolean;
          challenge_ts: Date;
          hostname: string;
          'error-codes'?: string[];
        }) => {
          if (response.success) {
            return true;
          }
          return false;
        },
      );

    return isVerified;
  }
}
