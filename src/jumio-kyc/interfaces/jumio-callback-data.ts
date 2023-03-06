/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface JumioCallbackData {
  callbackSentAt: string;
  userReference: string;
  workflowExecution: {
    id: string;
    href: string;
    status: 'PROCESSED' | 'SESSION_EXPIRED' | 'TOKEN_EXPIRED';
  };
  account: {
    id: string;
    href: string;
  };
}
