/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const APPROVED_REPEATED_FACE_FAILURE: JumioTransactionRetrieveResponse =
  {
    steps: {
      href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/workflow-executions/aab161b4-51dc-4dd3-96e3-0eb61fb89464/steps',
    },
    account: {
      id: '06ca5d21-f1fe-4878-bd90-dc55f7c52d9c',
    },
    decision: {
      risk: {
        score: 80,
      },
      type: 'REJECTED',
      details: {
        label: 'REJECTED',
      },
    },
    workflow: {
      id: 'aab161b4-51dc-4dd3-96e3-0eb61fb89464',
      status: 'PROCESSED',
      definitionKey: '10013',
      userReference:
        't=1680065468217,v1=d95ebe1562c0c3c14db722474c9a7a3ab69f78af5e382634ff7adf454813af75',
      customerInternalReference: '288376',
    },
    createdAt: '2023-03-29T04:51:08.291Z',
    startedAt: '2023-03-29T04:53:05.854Z',
    completedAt: '2023-03-29T04:53:24.719Z',
    credentials: [
      {
        id: '16654989-ea45-48a5-99f2-5cee59fe701c',
        parts: [
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/16654989-ea45-48a5-99f2-5cee59fe701c/parts/FRONT',
            classifier: 'FRONT',
          },
        ],
        category: 'ID',
      },
      {
        id: '4418f523-b5b4-4c21-8fcc-fe93f3fa8a92',
        parts: [
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/4418f523-b5b4-4c21-8fcc-fe93f3fa8a92/parts/FACE',
            classifier: 'FACE',
          },
        ],
        category: 'SELFIE',
      },
      {
        id: '6389d471-9522-4f0a-bf3e-191ffd6e5683',
        parts: [
          {
            classifier: 'FACEMAP',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/LIVENESS_1',
            classifier: 'LIVENESS_1',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/LIVENESS_3',
            classifier: 'LIVENESS_3',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/LIVENESS_2',
            classifier: 'LIVENESS_2',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/LIVENESS_5',
            classifier: 'LIVENESS_5',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/LIVENESS_4',
            classifier: 'LIVENESS_4',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/LIVENESS_6',
            classifier: 'LIVENESS_6',
          },
        ],
        category: 'FACEMAP',
      },
    ],
    capabilities: {
      liveness: [
        {
          id: '7b395bd9-e240-4c78-8133-b7959706f1c7',
          data: {
            type: 'IPROOV_STANDARD',
            predictedAge: 18,
            ageConfidenceRange: '9-27',
          },
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '4418f523-b5b4-4c21-8fcc-fe93f3fa8a92',
              category: 'SELFIE',
            },
            {
              id: '6389d471-9522-4f0a-bf3e-191ffd6e5683',
              category: 'FACEMAP',
            },
          ],
          validFaceMapForAuthentication:
            'https://retrieval.amer-1.jumio.ai/api/v1/accounts/06ca5d21-f1fe-4878-bd90-dc55f7c52d9c/credentials/6389d471-9522-4f0a-bf3e-191ffd6e5683/parts/FACEMAP',
        },
      ],
      usability: [
        {
          id: 'b6d95b92-c451-460f-aff3-2602cea43d82',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '4418f523-b5b4-4c21-8fcc-fe93f3fa8a92',
              category: 'SELFIE',
            },
          ],
        },
        {
          id: '3f28029c-1db9-4265-822a-853ef80d4e48',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '16654989-ea45-48a5-99f2-5cee59fe701c',
              category: 'ID',
            },
          ],
        },
        {
          id: 'ca567ce4-4c9e-4c27-b8f9-5e39d9444904',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '6389d471-9522-4f0a-bf3e-191ffd6e5683',
              category: 'FACEMAP',
            },
          ],
        },
      ],
      dataChecks: [
        {
          id: '94e0c8ff-e1e5-4b02-9af0-f4ae565ffd7e',
          decision: {
            type: 'REJECTED',
            details: {
              label: 'MISMATCHING_DATA_REPEATED_FACE',
            },
          },
          credentials: [
            {
              id: '16654989-ea45-48a5-99f2-5cee59fe701c',
              category: 'ID',
            },
          ],
        },
      ],
      extraction: [
        {
          id: 'ada58537-1a18-4de0-81c2-ea85addc4bc7',
          data: {
            issuingCountry: 'IND',
          },
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '16654989-ea45-48a5-99f2-5cee59fe701c',
              category: 'ID',
            },
          ],
        },
      ],
      similarity: [
        {
          id: '4a3d8fcc-89c3-48b7-97cc-cf3ce792db0f',
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
              id: '16654989-ea45-48a5-99f2-5cee59fe701c',
              category: 'ID',
            },
            {
              id: '4418f523-b5b4-4c21-8fcc-fe93f3fa8a92',
              category: 'SELFIE',
            },
          ],
        },
      ],
      imageChecks: [
        {
          id: '79a2bd59-2e84-40d6-aca2-d61380d5a13b',
          data: {
            faceSearchFindings: {
              status: 'DONE',
              findings: [
                '22d097d5-588e-40d1-9012-d26523d108c3',
                '0fbe088b-088f-474e-bed4-fe703dbed746',
                '29f8643b-455e-48e1-8365-c000ef8f6ec1',
                '251564f5-bdaa-4303-954b-1bc0f3d7c377',
                '481d119b-444d-4635-b91e-f0e14b2bd1a2',
                '43edc4d1-053c-4ac4-82fb-015f36ead1a6',
                'f5f0cc68-b91c-420e-8b88-8dff2bd66352',
                'd0b62788-e45f-47a7-849a-c7656471aff4',
              ],
            },
          },
          decision: {
            type: 'WARNING',
            details: {
              label: 'REPEATED_FACE',
            },
          },
          credentials: [
            {
              id: '16654989-ea45-48a5-99f2-5cee59fe701c',
              category: 'ID',
            },
            {
              id: '4418f523-b5b4-4c21-8fcc-fe93f3fa8a92',
              category: 'SELFIE',
            },
          ],
        },
      ],
      watchlistScreening: [
        {
          id: '238d0472-f5be-4576-a8fb-a45eb5263a4c',
          data: {
            searchId: '1252940936',
            searchDate: '2023-03-29T04:53:24.000Z',
            searchStatus: 'SUCCESS',
            searchResults: 0,
            searchReference: '1680065604-WvHmJ0uu',
            searchResultUrl:
              'https://app.complyadvantage.com/public/search/1680065604-WvHmJ0uu/f06c95710850',
          },
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '16654989-ea45-48a5-99f2-5cee59fe701c',
              category: 'ID',
            },
          ],
        },
      ],
    },
  };
