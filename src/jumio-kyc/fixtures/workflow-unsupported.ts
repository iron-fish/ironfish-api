/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const WORKFLOW_UNSUPPORTED: JumioTransactionRetrieveResponse = {
  steps: {
    href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/workflow-executions/fc3fd178-f594-4691-9ee6-092a548c9a9d/steps',
  },
  account: {
    id: '1e761cdb-f6c6-47b4-a200-815dac7a5b0b',
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
    id: 'fc3fd178-f594-4691-9ee6-092a548c9a9d',
    status: 'PROCESSED',
    definitionKey: '10013',
    userReference:
      't=1679657577251,v1=2737d630bc3fab1a9bc8a3f0f9a71e004c828cb315fbf756c70ce3c178bb730e',
    customerInternalReference: '290991',
  },
  createdAt: '2023-03-24T11:32:57.345Z',
  startedAt: '2023-03-24T11:37:28.412Z',
  completedAt: '2023-03-24T11:37:34.253Z',
  credentials: [
    {
      id: '0c5a2aa8-bfdd-44f1-8711-138d198309b2',
      parts: [
        {
          classifier: 'FACEMAP',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/LIVENESS_1',
          classifier: 'LIVENESS_1',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/LIVENESS_3',
          classifier: 'LIVENESS_3',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/LIVENESS_2',
          classifier: 'LIVENESS_2',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/LIVENESS_5',
          classifier: 'LIVENESS_5',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/LIVENESS_4',
          classifier: 'LIVENESS_4',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/LIVENESS_6',
          classifier: 'LIVENESS_6',
        },
      ],
      category: 'FACEMAP',
    },
    {
      id: '749d7c8e-87ca-4f0a-b475-dddb0c5d09fa',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/749d7c8e-87ca-4f0a-b475-dddb0c5d09fa/parts/FACE',
          classifier: 'FACE',
        },
      ],
      category: 'SELFIE',
    },
    {
      id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/107da47e-894c-4e86-bb84-aa4d0d12ca5d/parts/FRONT',
          classifier: 'FRONT',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/107da47e-894c-4e86-bb84-aa4d0d12ca5d/parts/BACK',
          classifier: 'BACK',
        },
      ],
      category: 'ID',
    },
  ],
  capabilities: {
    liveness: [
      {
        id: 'd84abaec-a116-41fe-a4cd-0a859cd51cc0',
        data: {
          type: 'IPROOV_STANDARD',
          predictedAge: 22,
          ageConfidenceRange: '12-32',
        },
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '0c5a2aa8-bfdd-44f1-8711-138d198309b2',
            category: 'FACEMAP',
          },
          {
            id: '749d7c8e-87ca-4f0a-b475-dddb0c5d09fa',
            category: 'SELFIE',
          },
        ],
        validFaceMapForAuthentication:
          'https://retrieval.amer-1.jumio.ai/api/v1/accounts/1e761cdb-f6c6-47b4-a200-815dac7a5b0b/credentials/0c5a2aa8-bfdd-44f1-8711-138d198309b2/parts/FACEMAP',
      },
    ],
    usability: [
      {
        id: 'e131f97b-5659-4031-891c-7218bd63baf4',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '0c5a2aa8-bfdd-44f1-8711-138d198309b2',
            category: 'FACEMAP',
          },
        ],
      },
      {
        id: 'b9d147cd-bd05-4497-9ba7-3abab6aba325',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '749d7c8e-87ca-4f0a-b475-dddb0c5d09fa',
            category: 'SELFIE',
          },
        ],
      },
      {
        id: 'ac95ec2f-9eb7-48c2-8d53-010def3cda88',
        decision: {
          type: 'WARNING',
          details: {
            label: 'UNSUPPORTED_DOCUMENT_TYPE',
          },
        },
        credentials: [
          {
            id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
            category: 'ID',
          },
        ],
      },
    ],
    dataChecks: [
      {
        id: '14944cd6-a81f-460b-b5dc-5932bf50c851',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
            category: 'ID',
          },
        ],
      },
    ],
    extraction: [
      {
        id: '9f16cb11-c219-49ac-ade9-28eda0af0cc9',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
            category: 'ID',
          },
        ],
      },
    ],
    similarity: [
      {
        id: '7883c1d7-b26a-4444-84cd-a61c455cda8e',
        data: {
          similarity: 'MATCH',
        },
        decision: {
          type: 'PASSED',
          details: {
            label: 'MATCH',
          },
        },
        credentials: [
          {
            id: '749d7c8e-87ca-4f0a-b475-dddb0c5d09fa',
            category: 'SELFIE',
          },
          {
            id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
            category: 'ID',
          },
        ],
      },
    ],
    imageChecks: [
      {
        id: '1c8b989b-15c7-4f2f-a64e-cb3192283fb8',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '749d7c8e-87ca-4f0a-b475-dddb0c5d09fa',
            category: 'SELFIE',
          },
          {
            id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
            category: 'ID',
          },
        ],
      },
    ],
    watchlistScreening: [
      {
        id: '2a901c17-a182-45d6-9457-33370d252442',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'VALIDATION_FAILED',
          },
        },
        credentials: [
          {
            id: '107da47e-894c-4e86-bb84-aa4d0d12ca5d',
            category: 'ID',
          },
        ],
      },
    ],
  },
};
