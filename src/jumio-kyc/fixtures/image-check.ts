/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ImageChecksLabel } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export const IMAGE_CHECK_FIXTURE = {
  id: '1568893e-5edc-453c-9c50-e47fa10578f8',
  credentials: [
    {
      id: 'fakecredentialsid',
      category: 'ID',
    },
    {
      id: 'fakecredentialsid',
      category: 'SELFIE',
    },
  ],
  decision: {
    type: 'WARNING',
    details: {
      label: 'REPEATED_FACE' as ImageChecksLabel,
    },
  },
  data: {
    faceSearchFindings: {
      status: 'DONE',
      findings: [
        'f7fe3c49-6221-4d87-b8b9-0cd243b65088',
        '85b26f35-cf4e-4a68-8bce-88c20f06d3ff',
      ],
    },
  },
};
