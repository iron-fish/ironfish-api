/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { v4 as uuid } from 'uuid';
import { JumioAccountCreateResponse } from '../../jumio-api/interfaces/jumio-account-create';

export const JUMIO_CREATE_RESPONSE: JumioAccountCreateResponse = {
  timestamp: '2023-03-10T04:30:53.549Z',
  account: {
    id: uuid(),
  },
  web: {
    href: uuid(),
  },
  workflowExecution: {
    id: uuid(),
    credentials: [
      {
        id: uuid(),
        category: 'DATA',
        allowedChannels: ['API'],
        api: {
          token: 'faketoken',
          parts: {
            prepared_data: 'http://jumio.com/parts',
          },
          workflowExecution: 'http://jumio.com/workflow',
        },
      },
    ],
  },
};
