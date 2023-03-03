/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import forge from 'node-forge';
import { ApiConfigService } from '../api-config/api-config.service';
import { LoggerService } from '../logger/logger.service';
import { JumioAccountCreateResponse } from './interfaces/jumio-account-create';
import { JumioTransactionRetrieveResponse } from './interfaces/jumio-transaction-retrieve';

@Injectable()
export class JumioApiService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly logger: LoggerService,
  ) {}

  async transactionStatus(
    jumio_account_id: string,
    jumio_workflow_execution_id: string,
  ): Promise<JumioTransactionRetrieveResponse> {
    const baseUrl = this.config.get<string>('JUMIO_URL');
    const url = `https://retrieval.${baseUrl}/accounts/${jumio_account_id}/workflow-executions/${jumio_workflow_execution_id}`;

    const response = await axios
      .get<JumioTransactionRetrieveResponse>(url, this.requestConfig())
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          const message = `Error retrieving workflow ${jumio_workflow_execution_id}: ${error.message}`;

          this.logger.warn(
            `${message} - ${JSON.stringify(error.response?.data)}`,
          );

          throw new BadRequestException(message);
        }
        throw error;
      });

    return response.data;
  }

  async createAccountAndTransaction(
    userId: number,
    jumioAccountId: string | null,
  ): Promise<JumioAccountCreateResponse> {
    let url =
      'https://account.' + this.config.get<string>('JUMIO_URL') + '/accounts';

    if (jumioAccountId) {
      // Adding the suffix of /<accountId> makes request update, rather than create
      // https://jumio.github.io/kyx/integration-guide.html
      url += `/${jumioAccountId}`;
    }

    const body = {
      customerInternalReference: userId,
      userReference: this.generateSignature(userId),
      callbackUrl: this.getCallbackUrl(),
      workflowDefinition: {
        key: this.config.get<number>('JUMIO_WORKFLOW_DEFINITION'),
      },
    };

    const response = await axios
      .post<JumioAccountCreateResponse>(url, body, this.requestConfig())
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          const message = `Error ${
            jumioAccountId ? 'updating' : 'creating'
          } jumio account: ${error.message}`;

          this.logger.warn(
            `${message} - ${JSON.stringify(error.response?.data)}`,
          );

          throw new BadRequestException(message);
        }
        throw error;
      });

    return response.data;
  }

  private generateSignature(userId: number): string {
    const ts = new Date().getTime();

    const hmac = forge.hmac.create();
    hmac.start('sha256', this.config.get<string>('JUMIO_API_CALLBACK_SECRET'));
    hmac.update(forge.util.encodeUtf8(`${ts}.${userId}`));

    return hmac.digest().toHex();
  }

  getCallbackUrl(): string {
    return this.config.get<string>('API_URL') + '/jumio/callback';
  }

  requestConfig(): AxiosRequestConfig {
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
  }
}
