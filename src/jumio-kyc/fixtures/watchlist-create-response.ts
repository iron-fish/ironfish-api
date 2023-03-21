/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { JumioAccountCreateResponse } from '../../jumio-api/interfaces/jumio-account-create';

export const WORKFLOW_CREATE_WATCHLIST_RESPONSE: JumioAccountCreateResponse = {
  timestamp: '2023-03-10T04:30:53.549Z',
  account: {
    id: 'aefa1cc2-011a-4615-8e7d-fdcaddb508cd',
  },
  web: {
    href: 'https://api.amer-1.jumio.ai/api/v1/accounts/aefa1cc2-011a-4615-8e7d-fdcaddb508cd',
  },
  workflowExecution: {
    id: 'b94de56f-75b7-4df2-9320-eebba497f138',
    credentials: [
      {
        id: '0aa24a7c-ce41-4647-8b87-c0ed5d657da7',
        category: 'DATA',
        allowedChannels: ['API'],
        api: {
          token:
            'eyJhbGciOiJIUzUxMiIsInppcCI6IkdaSVAifQ.--OX2Dx83871kWe7zkHV-PvbxeMDJCyY2MLYO1AShIWfY4lI36V6MwvcHxGrHQ-UAAAA.ihiFoZ9qso1kcTj0bN8K2pK4s-_nzTW3g8f5Q6m3bd7ul6zubEA_CrUFcdi5n_xItzOAwq3Kgl8Kd3vQKi4OHw',
          parts: {
            prepared_data:
              'https://api.amer-1.jumio.ai/api/v1/accounts/aefa1cc2-011a-4615-8e7d-fdcaddb508cd/workflow-executions/b94de56f-75b7-4df2-9320-eebba497f138/credentials/0aa24a7c-ce41-4647-8b87-c0ed5d657da7/parts/PREPARED_DATA',
          },
          workflowExecution:
            'https://api.amer-1.jumio.ai/api/v1/accounts/aefa1cc2-011a-4615-8e7d-fdcaddb508cd/workflow-executions/b94de56f-75b7-4df2-9320-eebba497f138',
        },
      },
    ],
  },
};
