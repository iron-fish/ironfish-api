/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { KycDetails } from '../jumio-kyc/kyc.service';

@Injectable()
export class JumioApiService {
  async createAccountAndTransaction(
    jumioAccountId: string | null,
  ): Promise<KycDetails> {
    return Promise.resolve({
      jumio_account_id: 'foo',
      jumio_workflow_execution_id: 'bar',
      jumio_web_href:
        'https://ironfish.web.amer-1.jumio.ai/web/v4/app?authorizationToken=eyJ...i0g&locale=en',
    });
  }
}
