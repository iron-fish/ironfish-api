/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const WORKFLOW_USABILITY_ERROR: JumioTransactionRetrieveResponse = {
  steps: {
    href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/workflow-executions/12edb8c0-f27c-4ddb-80c9-e09fde4c6172/steps',
  },
  account: {
    id: '285d5a7f-1519-4c9d-a063-3d49257d4803',
  },
  decision: {
    risk: {
      score: 100,
    },
    type: 'REJECTED',
    details: {
      label: 'REJECTED',
    },
  },
  workflow: {
    id: '12edb8c0-f27c-4ddb-80c9-e09fde4c6172',
    status: 'PROCESSED',
    definitionKey: '10013',
    userReference:
      't=1679494005613,v1=928aa942a7ebe347f2a787f1b9524fcf765d9eb16f217c7cb134fc39eee36bab',
    customerInternalReference: '11175',
  },
  createdAt: '2023-03-22T14:06:45.677Z',
  startedAt: '2023-03-22T14:10:33.340Z',
  completedAt: '2023-03-22T14:10:48.538Z',
  credentials: [
    {
      id: '05278db6-2435-4764-a850-bd4753237a5e',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/05278db6-2435-4764-a850-bd4753237a5e/parts/FACE',
          classifier: 'FACE',
        },
      ],
      category: 'SELFIE',
    },
    {
      id: 'fb960849-af71-4017-919f-f653a41189b8',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/fb960849-af71-4017-919f-f653a41189b8/parts/FRONT',
          classifier: 'FRONT',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/fb960849-af71-4017-919f-f653a41189b8/parts/BACK',
          classifier: 'BACK',
        },
      ],
      category: 'ID',
    },
    {
      id: '4fad0545-1697-4bbe-b5ab-ec9bb40878b7',
      parts: [
        {
          classifier: 'FACEMAP',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/LIVENESS_1',
          classifier: 'LIVENESS_1',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/LIVENESS_3',
          classifier: 'LIVENESS_3',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/LIVENESS_2',
          classifier: 'LIVENESS_2',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/LIVENESS_5',
          classifier: 'LIVENESS_5',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/LIVENESS_4',
          classifier: 'LIVENESS_4',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/LIVENESS_6',
          classifier: 'LIVENESS_6',
        },
      ],
      category: 'FACEMAP',
    },
  ],
  capabilities: {
    liveness: [
      {
        id: 'e0cdbda2-9a06-4b58-9ab9-9c8bddd2e3b0',
        data: {
          type: 'IPROOV_STANDARD',
          predictedAge: 31,
          ageConfidenceRange: '21-41',
        },
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '05278db6-2435-4764-a850-bd4753237a5e',
            category: 'SELFIE',
          },
          {
            id: '4fad0545-1697-4bbe-b5ab-ec9bb40878b7',
            category: 'FACEMAP',
          },
        ],
        validFaceMapForAuthentication:
          'https://retrieval.amer-1.jumio.ai/api/v1/accounts/285d5a7f-1519-4c9d-a063-3d49257d4803/credentials/4fad0545-1697-4bbe-b5ab-ec9bb40878b7/parts/FACEMAP',
      },
    ],
    usability: [
      {
        id: '24b481c6-bd5f-499d-8d4c-3090426633ca',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '05278db6-2435-4764-a850-bd4753237a5e',
            category: 'SELFIE',
          },
        ],
      },
      {
        id: '93f013b8-30f1-415f-8649-87953fff288b',
        decision: {
          type: 'REJECTED',
          details: {
            label: 'MISSING_SIGNATURE',
          },
        },
        credentials: [
          {
            id: 'fb960849-af71-4017-919f-f653a41189b8',
            category: 'ID',
          },
        ],
      },
      {
        id: '09a9cea5-a636-4f50-a12d-aa2944fab27e',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '4fad0545-1697-4bbe-b5ab-ec9bb40878b7',
            category: 'FACEMAP',
          },
        ],
      },
    ],
    dataChecks: [
      {
        id: '0bc0bc63-167d-4a3a-9d16-997c8c8cf6c2',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: 'fb960849-af71-4017-919f-f653a41189b8',
            category: 'ID',
          },
        ],
      },
    ],
    extraction: [
      {
        id: '4bb1ddc3-d0ff-4636-bb34-dee215a98657',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: 'fb960849-af71-4017-919f-f653a41189b8',
            category: 'ID',
          },
        ],
      },
    ],
    similarity: [
      {
        id: '71bc88f5-28ea-4e76-b11b-68ebb269937d',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '05278db6-2435-4764-a850-bd4753237a5e',
            category: 'SELFIE',
          },
          {
            id: 'fb960849-af71-4017-919f-f653a41189b8',
            category: 'ID',
          },
        ],
      },
    ],
    imageChecks: [
      {
        id: '24d75444-c77b-4499-845d-0099e5d541cb',
        data: {
          faceSearchFindings: {
            status: 'DONE',
            findings: ['ff8ac363-fe21-46b9-b559-5afc1becaba5'],
          },
        },
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '05278db6-2435-4764-a850-bd4753237a5e',
            category: 'SELFIE',
          },
          {
            id: 'fb960849-af71-4017-919f-f653a41189b8',
            category: 'ID',
          },
        ],
      },
    ],
    watchlistScreening: [
      {
        id: '6e53157e-da40-48b3-9eef-d0e5096a7bac',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'VALIDATION_FAILED',
          },
        },
        credentials: [
          {
            id: 'fb960849-af71-4017-919f-f653a41189b8',
            category: 'ID',
          },
        ],
      },
    ],
  },
};
