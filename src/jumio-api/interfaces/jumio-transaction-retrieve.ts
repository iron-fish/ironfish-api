/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface JumioTransactionRetrieveResponse {
  account: {
    id: string;
  };
  web: {
    href: string;
  };
  decision: {
    risk: {
      score: number; //0-100.00
    };
    details: {
      label:
        | 'NOT_EXECUTED'
        | 'PASSED'
        | 'REJECTED'
        | 'TECHNICAL_ERROR'
        | 'WARNING';
    };
  };
}
