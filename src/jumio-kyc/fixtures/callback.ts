/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { JumioCallbackData } from '../interfaces/jumio-callback-data';

export const CALLBACK_FIXTURE = (
  accountId: string,
  workflowId: string,
  userReference: string,
  workflowStatus: 'PROCESSED' | 'SESSION_EXPIRED' | 'TOKEN_EXPIRED',
): JumioCallbackData => {
  return {
    callbackSentAt: '2023-03-02T21:30:32.722Z',
    userReference: userReference,
    workflowExecution: {
      id: workflowId,
      href: '',
      status: workflowStatus,
    },
    account: {
      id: accountId,
      href: '',
    },
  };
};
