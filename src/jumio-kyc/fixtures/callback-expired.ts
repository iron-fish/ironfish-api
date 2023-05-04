/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { JumioCallbackData } from '../interfaces/jumio-callback-data';

export const CALLBACK_EXPIRED = (workflowId = ''): JumioCallbackData => ({
  account: {
    id: '30d60727-7d5a-44f0-80f6-76c2679a2de4',
    href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/30d60727-7d5a-44f0-80f6-76c2679a2de4',
  },
  userReference:
    't=1678904069066,v1=4a03e3d19ad044880de341f8e0c6652ea87c73343f1481a7d0471cd5de0b3b7e',
  callbackSentAt: '2023-03-15T19:14:51.286Z',
  workflowExecution: {
    id: workflowId,
    href: 'https://retrieval.amer-1.jumio.ai/api/v1/workflow-executions/a3d9de27-b5b5-492f-9389-7eef5b6f106b',
    status: 'TOKEN_EXPIRED',
    definitionKey: '10013',
  },
});
