/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { ApiConfigService } from '../api-config/api-config.service';
import { ScreeningData } from '../jumio-kyc/interfaces/screening-data';
import { LoggerService } from '../logger/logger.service';
import { JumioAccountCreateResponse } from './interfaces/jumio-account-create';
import { JumioPutStandaloneScreening } from './interfaces/jumio-put-standalone-screening';
import { JumioStandaloneUpload } from './interfaces/jumio-standalone-screening-create';
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
    sanitize = true,
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

    // Sanitize extracted values
    if (sanitize && 'extraction' in response.data.capabilities) {
      for (const extraction of response.data.capabilities.extraction) {
        const sanitized = {
          issuingCountry: extraction.data.issuingCountry,
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        extraction.data = sanitized as any;
      }
    }

    return response.data;
  }

  async createAccountAndTransaction(
    userId: number,
    jumioAccountId: string | null,
    workflowDefinitionKey: string,
  ): Promise<JumioAccountCreateResponse> {
    let url =
      'https://account.' + this.config.get<string>('JUMIO_URL') + '/accounts';

    if (jumioAccountId) {
      // Adding the suffix of /<accountId> makes request update, rather than create
      // https://jumio.github.io/kyx/integration-guide.html
      url += `/${jumioAccountId}`;
    }

    const { ts, hmac } = this.generateSignature(userId);
    const body = {
      customerInternalReference: userId,
      userReference: `t=${ts},v1=${hmac}`,
      callbackUrl: this.getCallbackUrl(),
      workflowDefinition: {
        key: workflowDefinitionKey,
        capabilities: {
          watchlistScreening: {
            additionalProperties: '',
          },
        },
      },
    };

    const promise = jumioAccountId
      ? axios.put<JumioAccountCreateResponse>(url, body, this.requestConfig())
      : axios.post<JumioAccountCreateResponse>(url, body, this.requestConfig());

    const response = await promise.catch((error) => {
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

  async uploadScreeningData(
    url: string,
    token: string,
    data: ScreeningData,
  ): Promise<JumioStandaloneUpload> {
    const jsonData = JSON.stringify(data);
    const config = {
      method: 'post',
      url: url,
      headers: {
        'User-Agent': 'IronFish Website/v1.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: jsonData,
    };
    const promise = axios(config);

    const response = await promise.catch((error) => {
      if (axios.isAxiosError(error)) {
        this.logger.warn(`${JSON.stringify(error.response?.data)}`);
        throw new BadRequestException(`Error updating standalone ${url}`);
      }
      throw error;
    });

    return response.data as JumioStandaloneUpload;
  }

  async putStandaloneScreening(
    url: string,
    token: string,
  ): Promise<JumioPutStandaloneScreening> {
    const config = {
      method: 'put',
      url: url,
      headers: {
        'User-Agent': 'IronFish Website/v1.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    const promise = axios(config);

    const response = await promise.catch((error) => {
      if (axios.isAxiosError(error)) {
        this.logger.warn(`${JSON.stringify(error.response?.data)}`);

        throw new BadRequestException(`Error updating standalone ${url}`);
      }
      throw error;
    });

    return response.data as JumioPutStandaloneScreening;
  }

  getScreeningDataFromRetrieval(
    status: JumioTransactionRetrieveResponse,
  ): ScreeningData {
    let firstName = null;
    let lastName = null;
    let dateOfBirth = null;
    let country = null;
    for (const extraction of status.capabilities.extraction) {
      if (extraction.data.dateOfBirth) {
        dateOfBirth = extraction.data.dateOfBirth;
      }
      if (extraction.data.firstName) {
        firstName = extraction.data.firstName;
      }
      if (extraction.data.lastName) {
        lastName = extraction.data.lastName;
      }
      if (extraction.data.issuingCountry) {
        country = extraction.data.issuingCountry;
      }
    }
    if (!firstName || !lastName || !dateOfBirth || !country) {
      throw new BadRequestException(
        'Required user info field not present on transaction',
      );
    }
    return {
      firstName,
      lastName,
      dateOfBirth,
      address: {
        country: country,
      },
    };
  }

  private generateSignature(userId: number): { ts: number; hmac: string } {
    const ts = new Date().getTime();
    const hmac = crypto
      .createHmac(
        'sha256',
        this.config.get<string>('JUMIO_API_CALLBACK_SECRET'),
      )
      .update(`${ts}.${userId}`)
      .digest()
      .toString('hex');
    return { ts, hmac };
  }

  getCallbackUrl(): string {
    return this.config.get<string>('API_URL') + '/kyc/callback';
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
