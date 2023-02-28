/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { ApiConfigService } from '../api-config/api-config.service';
import { KycDetails } from '../jumio-kyc/kyc.service';
import { JumioAccountCreateResponse } from './interfaces/jumio-account-create';

@Injectable()
export class JumioApiService {
  constructor(private readonly config: ApiConfigService) {}

  async createAccountAndTransaction(
    userId: number,
    jumioAccountId: string | null,
  ): Promise<KycDetails> {
    let url = this.config.get<string>('JUMIO_URL') + '/accounts';

    if (jumioAccountId) {
      // Adding the suffix of /<accountId> makes request update, rather than create
      // https://jumio.github.io/kyx/integration-guide.html
      url += `/${jumioAccountId}`;
    }

    const body = {
      customerInternalReference: userId,
      userReference: userId,
      callbackUrl: 'https://foo',
      workflowDefinition: {
        key: Number(this.config.get<string>('JUMIO_WORKFLOW_DEFINITION')),
      },
    };

    const response = await axios
      .post<JumioAccountCreateResponse>(url, body, this.requestConfig())
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new BadRequestException(
            `Error creating jumio account: ${error.message}`,
          );
        }
        throw error;
      });

    return {
      jumio_account_id: response.data.account.id,
      jumio_workflow_execution_id: response.data.workflowExecution.id,
      jumio_web_href: response.data.web.href,
    };
  }

  requestConfig = (): AxiosRequestConfig => {
    const jumioToken = this.config.get<string>('JUMIO_API_TOKEN');
    const jumioSecret = this.config.get<string>('JUMIO_API_SECRET');
    const authString = `${jumioToken}:${jumioSecret}`;
    const token = Buffer.from(authString).toString('base64');

    return {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
        'User-Agent': 'IronFish Website/v1.0',
      },
    };
  };
}
