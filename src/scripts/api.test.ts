/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { v4 as uuid } from 'uuid';

export type ApiMaspUpload = {
  type: 'connected' | 'disconnected' | 'fork';
  block: {
    hash: string;
    timestamp: number;
    sequence: number;
  };
  transactions: {
    hash: string;
    type: 'MASP_TRANSFER' | 'MASP_BURN' | 'MASP_MINT';
    assetName: string;
  }[];
};

/**
 *  The API should be compatible with the Ironfish API here
 *  used to host our Facuet, BlockExplorer, and other things.
 *  https://github.com/iron-fish/ironfish-api
 */
export class WebApi {
  host: string;
  token: string;
  getFundsEndpoint: string | null;

  constructor(options?: {
    host?: string;
    token?: string;
    getFundsEndpoint?: string;
  }) {
    let host = options?.host ?? 'https://api.ironfish.network';

    if (host.endsWith('/')) {
      host = host.slice(0, -1);
    }

    this.host = host;
    this.token = options?.token || '';
    this.getFundsEndpoint = options?.getFundsEndpoint || null;
  }
  async headMaspTransactions(): Promise<string | null> {
    const response = await axios
      .get<{ block_hash: string }>(`${this.host}/masp/head`)
      .catch((e) => {
        // The API returns 404 for no head
        if (IsAxiosError(e) && e.response?.status === 404) {
          return null;
        }

        throw e;
      });

    return response?.data.block_hash || null;
  }

  async uploadMaspTransactions(
    maspTransactions: ApiMaspUpload[],
  ): Promise<void> {
    this.requireToken();

    const options = this.options({ 'Content-Type': 'application/json' });
    await axios.post(
      `${this.host}/masp`,
      { operations: maspTransactions },
      options,
    );
  }

  options(headers: Record<string, string> = {}): AxiosRequestConfig {
    return {
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...headers,
      },
    };
  }

  requireToken(): void {
    if (!this.token) {
      throw new Error(`Token required for endpoint`);
    }
  }
}
// eslint-disable-next-line @typescript-eslint/ban-types
export function HasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y,
): boolean {
  return Object.hasOwnProperty.call(obj, prop);
}

export function IsAxiosError(e: unknown): e is AxiosError {
  return (
    typeof e === 'object' && e != null && HasOwnProperty(e, 'isAxiosError')
  );
}

const api = new WebApi({
  host: 'localhost:8003',
  token: process.env.IRONFISH_API_KEY,
});

setTimeout(
  () => async () =>
    await api.uploadMaspTransactions([
      {
        type: 'connected',
        block: {
          hash: uuid(),
          timestamp: new Date().getTime(),
          sequence: 1,
        },
        transactions: [
          {
            hash: uuid(),
            type: 'MASP_MINT',
            assetName: 'jowparks',
          },
        ],
      },
    ]),
  3000,
);
