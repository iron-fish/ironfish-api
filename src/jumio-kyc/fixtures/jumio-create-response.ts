/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { v4 as uuid } from 'uuid';

export const JUMIO_CREATE_RESPONSE = {
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
