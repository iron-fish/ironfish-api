/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  LivenessCheck,
  LivenessLabel,
} from '../../jumio-api/interfaces/jumio-transaction-retrieve';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export const LIVENESS_CHECK_FIXTURE = (
  label: LivenessLabel = 'OK',
): LivenessCheck => {
  return {
    id: '3bfa4f49-148d-4361-acc3-10928f69562a',
    validFaceMapForAuthentication:
      'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/FACEMAP',
    credentials: [
      {
        id: 'fakecredentialsid',
        category: 'FACEMAP',
      },
      {
        id: 'fakecredentialsid',
        category: 'SELFIE',
      },
    ],
    decision: {
      type: 'PASSED',
      details: {
        label: label,
      },
    },
    data: {
      type: 'IPROOV_STANDARD',
      predictedAge: 31,
      ageConfidenceRange: '21-41',
    },
  };
};
