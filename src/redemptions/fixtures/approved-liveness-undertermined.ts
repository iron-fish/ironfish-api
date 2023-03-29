/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const APPROVED_LIVENESS_UNDETERMINED_FIXTURE: JumioTransactionRetrieveResponse =
  {
    steps: {
      href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/workflow-executions/aa9898b0-023c-479e-8b48-79f3bbc333a3/steps',
    },
    account: {
      id: '378cf8b1-c585-44f5-b017-7b1768762472',
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
      id: 'aa9898b0-023c-479e-8b48-79f3bbc333a3',
      status: 'PROCESSED',
      definitionKey: '10013',
      userReference:
        't=1680032515560,v1=6c9aefea3c76faf60aeff0547d4f7904c394f2950b864362921c79230fcbb0d8',
      customerInternalReference: '212560',
    },
    createdAt: '2023-03-28T19:41:55.641Z',
    startedAt: '2023-03-28T19:42:56.069Z',
    completedAt: '2023-03-28T19:43:08.976Z',
    credentials: [
      {
        id: 'cc355e41-0da4-409f-a334-afbf1e69c19d',
        parts: [
          {
            classifier: 'FACEMAP',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/cc355e41-0da4-409f-a334-afbf1e69c19d/parts/LIVENESS_1',
            classifier: 'LIVENESS_1',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/cc355e41-0da4-409f-a334-afbf1e69c19d/parts/LIVENESS_3',
            classifier: 'LIVENESS_3',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/cc355e41-0da4-409f-a334-afbf1e69c19d/parts/LIVENESS_2',
            classifier: 'LIVENESS_2',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/cc355e41-0da4-409f-a334-afbf1e69c19d/parts/LIVENESS_5',
            classifier: 'LIVENESS_5',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/cc355e41-0da4-409f-a334-afbf1e69c19d/parts/LIVENESS_4',
            classifier: 'LIVENESS_4',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/cc355e41-0da4-409f-a334-afbf1e69c19d/parts/LIVENESS_6',
            classifier: 'LIVENESS_6',
          },
        ],
        category: 'FACEMAP',
      },
      {
        id: '837d715d-71b4-40b0-87f1-42558e2f0c2d',
        parts: [
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/837d715d-71b4-40b0-87f1-42558e2f0c2d/parts/FACE',
            classifier: 'FACE',
          },
        ],
        category: 'SELFIE',
      },
      {
        id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
        parts: [
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/91bd05a9-66d3-40e4-a05b-e79b83d80792/parts/FRONT',
            classifier: 'FRONT',
          },
        ],
        category: 'ID',
      },
    ],
    capabilities: {
      liveness: [
        {
          id: 'ba909af0-afe4-4271-bba0-705e1e577b0a',
          decision: {
            type: 'WARNING',
            details: {
              label: 'BAD_QUALITY',
            },
          },
          credentials: [
            {
              id: 'cc355e41-0da4-409f-a334-afbf1e69c19d',
              category: 'FACEMAP',
            },
            {
              id: '837d715d-71b4-40b0-87f1-42558e2f0c2d',
              category: 'SELFIE',
            },
          ],
          validFaceMapForAuthentication:
            'https://retrieval.amer-1.jumio.ai/api/v1/accounts/378cf8b1-c585-44f5-b017-7b1768762472/credentials/63c84457-5c97-47ed-a730-3cd60868eb30/parts/FACEMAP',
        },
      ],
      usability: [
        {
          id: '5a5125ac-02aa-4991-a235-6d9ecab01d76',
          decision: {
            type: 'WARNING',
            details: {
              label: 'LIVENESS_UNDETERMINED',
            },
          },
          credentials: [
            {
              id: 'cc355e41-0da4-409f-a334-afbf1e69c19d',
              category: 'FACEMAP',
            },
          ],
        },
        {
          id: 'e05cbf6a-45c3-4887-9cad-9c0ead6e1dd7',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '837d715d-71b4-40b0-87f1-42558e2f0c2d',
              category: 'SELFIE',
            },
          ],
        },
        {
          id: '3a9c7d6f-4482-4293-890b-45c96ec2db2d',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
              category: 'ID',
            },
          ],
        },
      ],
      dataChecks: [
        {
          id: '895b7aed-8d59-4d8f-b346-a1497195ec9a',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
              category: 'ID',
            },
          ],
        },
      ],
      extraction: [
        {
          id: '269a595e-f3c1-40dd-a587-f2ce70b195f3',
          data: {
            issuingCountry: 'UKR',
          },
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
              category: 'ID',
            },
          ],
        },
      ],
      similarity: [
        {
          id: 'f5e751be-3424-4b10-8d83-326c3dbb60d4',
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
              id: '837d715d-71b4-40b0-87f1-42558e2f0c2d',
              category: 'SELFIE',
            },
            {
              id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
              category: 'ID',
            },
          ],
        },
      ],
      imageChecks: [
        {
          id: '6b694878-0c12-4806-ac2e-6336beb034ac',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '837d715d-71b4-40b0-87f1-42558e2f0c2d',
              category: 'SELFIE',
            },
            {
              id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
              category: 'ID',
            },
          ],
        },
      ],
      watchlistScreening: [
        {
          id: 'a4fb994a-35b8-4047-ac65-ea5fc79cff4e',
          data: {
            searchId: '1252703144',
            searchDate: '2023-03-28T19:43:08.000Z',
            searchStatus: 'SUCCESS',
            searchResults: 0,
            searchReference: '1680032588-14w4N7bT',
            searchResultUrl:
              'https://app.complyadvantage.com/public/search/1680032588-14w4N7bT/05f688145fc3',
          },
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '91bd05a9-66d3-40e4-a05b-e79b83d80792',
              category: 'ID',
            },
          ],
        },
      ],
    },
  };
