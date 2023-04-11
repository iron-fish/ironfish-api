/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const WORKFLOW_SIMILARITY: JumioTransactionRetrieveResponse = {
  steps: {
    href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/workflow-executions/99f315be-791a-4e39-bd6b-72f379210581/steps',
  },
  account: {
    id: 'c767c529-f22c-497f-9104-56b44843ddec',
  },
  decision: {
    risk: {
      score: 40,
    },
    type: 'WARNING',
    details: {
      label: 'WARNING',
    },
  },
  workflow: {
    id: '99f315be-791a-4e39-bd6b-72f379210581',
    status: 'PROCESSED',
    definitionKey: '10013',
    userReference:
      't=1681221305086,v1=232cf82f117b84be7674e5ecf3b1385627e821a07dffc9aa6f6d53767d73e24f',
    customerInternalReference: '8846',
  },
  createdAt: '2023-04-11T13:55:05.156Z',
  startedAt: '2023-04-11T13:56:37.970Z',
  completedAt: '2023-04-11T14:00:32.226Z',
  credentials: [
    {
      id: '7e0c750b-9ad6-4ad8-bdb8-e7a225919f94',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/7e0c750b-9ad6-4ad8-bdb8-e7a225919f94/parts/FACE',
          classifier: 'FACE',
        },
      ],
      category: 'SELFIE',
    },
    {
      id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4/parts/FRONT',
          classifier: 'FRONT',
        },
      ],
      category: 'ID',
    },
    {
      id: 'b5a64c8a-436e-4048-aba4-132832941349',
      parts: [
        {
          classifier: 'FACEMAP',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/LIVENESS_1',
          classifier: 'LIVENESS_1',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/LIVENESS_3',
          classifier: 'LIVENESS_3',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/LIVENESS_2',
          classifier: 'LIVENESS_2',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/LIVENESS_5',
          classifier: 'LIVENESS_5',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/LIVENESS_4',
          classifier: 'LIVENESS_4',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/LIVENESS_6',
          classifier: 'LIVENESS_6',
        },
      ],
      category: 'FACEMAP',
    },
  ],
  capabilities: {
    liveness: [
      {
        id: 'fea78bed-cd61-4b22-8115-94011ec9aebc',
        data: {
          type: 'IPROOV_STANDARD',
          predictedAge: 35,
          ageConfidenceRange: '24-46',
        },
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '7e0c750b-9ad6-4ad8-bdb8-e7a225919f94',
            category: 'SELFIE',
          },
          {
            id: 'b5a64c8a-436e-4048-aba4-132832941349',
            category: 'FACEMAP',
          },
        ],
        validFaceMapForAuthentication:
          'https://retrieval.amer-1.jumio.ai/api/v1/accounts/c767c529-f22c-497f-9104-56b44843ddec/credentials/b5a64c8a-436e-4048-aba4-132832941349/parts/FACEMAP',
      },
    ],
    usability: [
      {
        id: 'ad9310e3-1e7d-4bd1-b4b1-d3975ba409c2',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
            category: 'ID',
          },
        ],
      },
      {
        id: '33c9e3af-7629-48aa-b21b-e5df499e1f0b',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: 'b5a64c8a-436e-4048-aba4-132832941349',
            category: 'FACEMAP',
          },
        ],
      },
      {
        id: '12209911-259c-4ed4-87fc-08b275806671',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '7e0c750b-9ad6-4ad8-bdb8-e7a225919f94',
            category: 'SELFIE',
          },
        ],
      },
    ],
    dataChecks: [
      {
        id: '3083aa15-5cdc-4353-a86b-fc8d2dd6bf51',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
            category: 'ID',
          },
        ],
      },
    ],
    extraction: [
      {
        id: '5f314540-d8ee-4405-8032-7d5de3c7a568',
        data: {
          issuingCountry: 'RUS',
        },
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
            category: 'ID',
          },
        ],
      },
    ],
    similarity: [
      {
        id: '29ce032d-6e74-482c-8768-9b75cd0b3faa',
        data: {
          similarity: 'MATCH',
        },
        decision: {
          type: 'WARNING',
          details: {
            label: 'NOT_POSSIBLE',
          },
        },
        credentials: [
          {
            id: '7e0c750b-9ad6-4ad8-bdb8-e7a225919f94',
            category: 'SELFIE',
          },
          {
            id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
            category: 'ID',
          },
        ],
      },
    ],
    imageChecks: [
      {
        id: '621dacba-3692-4412-becd-50262e0aa854',
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: '7e0c750b-9ad6-4ad8-bdb8-e7a225919f94',
            category: 'SELFIE',
          },
          {
            id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
            category: 'ID',
          },
        ],
      },
    ],
    watchlistScreening: [
      {
        id: '8d8b8284-4a42-43a7-9dd6-0fc3e9e9b5cf',
        data: {
          searchId: '1265897060',
          searchDate: '2023-04-11T14:00:31.000Z',
          searchStatus: 'SUCCESS',
          searchResults: 0,
          searchReference: '1681221631-MGLeypMS',
          searchResultUrl:
            'https://app.complyadvantage.com/public/search/1681221631-MGLeypMS/3a8094315cb0',
        },
        decision: {
          type: 'PASSED',
          details: {
            label: 'OK',
          },
        },
        credentials: [
          {
            id: 'cbe2e6b0-8eb9-49d8-b780-62b3ec1d1ee4',
            category: 'ID',
          },
        ],
      },
    ],
  },
};
