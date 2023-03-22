/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const WORKFLOW_EXPIRED: JumioTransactionRetrieveResponse = {
  steps: {
    href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakecredentialsid/workflow-executions/fakecredentialsid/steps',
  },
  account: {
    id: '30d60727-7d5a-44f0-80f6-76c2679a2de4',
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
    id: 'e5a57aac-1dc9-4bf0-991a-d33fdcb9ae23',
    status: 'SESSION_EXPIRED',
    definitionKey: '10013',
    userReference:
      't=1678655281214,v1=73d46b8cef4e4a02f7ffc551e0da57b0b64624c22f6dcbffac68c14d6b010050',
    customerInternalReference: '1080',
  },
  createdAt: '2023-03-12T21:08:01.329Z',
  completedAt: '2023-03-12T21:45:17.787Z',
  credentials: [
    {
      id: '09bd11d6-fa3d-486c-8e19-bcdc575dbfe2',
      category: 'SELFIE',
    },
    {
      id: 'ce71b4aa-495e-41e4-8d17-2e3a458a43f1',
      category: 'FACEMAP',
    },
    {
      id: '23aefa10-38b8-43cb-8d1a-c73081b2d492',
      parts: [
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakecredentialsid/credentials/fakecredentialsid/parts/FRONT',
          classifier: 'FRONT',
        },
        {
          href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakecredentialsid/credentials/fakecredentialsid/parts/BACK',
          classifier: 'BACK',
        },
      ],
      category: 'ID',
    },
  ],
  capabilities: {
    liveness: [
      {
        id: '62606b1d-cc72-487b-b1ef-fbefa7a8670c',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '09bd11d6-fa3d-486c-8e19-bcdc575dbfe2',
            category: 'SELFIE',
          },
          {
            id: 'ce71b4aa-495e-41e4-8d17-2e3a458a43f1',
            category: 'FACEMAP',
          },
        ],
      },
    ],
    usability: [
      {
        id: '008280cd-ae6a-46d8-a4ed-0d304ba0b2ca',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'NOT_UPLOADED',
          },
        },
        credentials: [
          {
            id: 'ce71b4aa-495e-41e4-8d17-2e3a458a43f1',
            category: 'FACEMAP',
          },
        ],
      },
      {
        id: '8430adda-c881-4c7d-a23b-1b4cacd1b1b9',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'NOT_UPLOADED',
          },
        },
        credentials: [
          {
            id: '09bd11d6-fa3d-486c-8e19-bcdc575dbfe2',
            category: 'SELFIE',
          },
        ],
      },
      {
        id: '3060fd7e-15f8-4c4d-84a1-0d5ac5b23aa1',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'NOT_UPLOADED',
          },
        },
        credentials: [
          {
            id: '23aefa10-38b8-43cb-8d1a-c73081b2d492',
            category: 'ID',
          },
        ],
      },
    ],
    dataChecks: [
      {
        id: '46fda01a-9d1e-4b1d-b40c-fdf94279f583',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '23aefa10-38b8-43cb-8d1a-c73081b2d492',
            category: 'ID',
          },
        ],
      },
    ],
    extraction: [
      {
        id: '43b624a9-5a31-4be6-8fe7-79c6b4a68b94',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '23aefa10-38b8-43cb-8d1a-c73081b2d492',
            category: 'ID',
          },
        ],
      },
    ],
    similarity: [
      {
        id: '199f4260-f0a6-460f-b78f-c306aa7a53c4',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '09bd11d6-fa3d-486c-8e19-bcdc575dbfe2',
            category: 'SELFIE',
          },
          {
            id: '23aefa10-38b8-43cb-8d1a-c73081b2d492',
            category: 'ID',
          },
        ],
      },
    ],
    imageChecks: [
      {
        id: '2f291b71-3829-4ba0-99e5-0c83a69cf4f6',
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
        credentials: [
          {
            id: '09bd11d6-fa3d-486c-8e19-bcdc575dbfe2',
            category: 'SELFIE',
          },
          {
            id: '23aefa10-38b8-43cb-8d1a-c73081b2d492',
            category: 'ID',
          },
        ],
      },
    ],
    watchlistScreening: [
      {
        id: 'cc3b692e-5161-4930-b777-ba15f273ce9e',
        data: {},
        decision: {
          type: 'NOT_EXECUTED',
          details: {
            label: 'PRECONDITION_NOT_FULFILLED',
          },
        },
      },
    ],
  },
};
