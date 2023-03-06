/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DecisionStatus } from '@prisma/client';
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export const WORKFLOW_RETRIEVE_FIXTURE = (
  workflowStatus: 'TOKEN_EXPIRED' | 'SESSION_EXPIRED' | 'PROCESSED',
  idCountryCode: string,
  decisionStatus: DecisionStatus,
): JumioTransactionRetrieveResponse => {
  return {
    workflow: {
      id: 'fakeworkflowid',
      status: workflowStatus,
      definitionKey: '10013',
      customerInternalReference: 'FOO',
    },
    account: {
      id: 'fakeaccountid',
    },
    createdAt: '2023-03-02T18:48:37.319Z',
    startedAt: '2023-03-02T19:04:42.008Z',
    completedAt: '2023-03-02T19:05:00.687Z',
    credentials: [
      {
        id: 'fakecredentialsid',
        category: 'ID',
        parts: [
          {
            classifier: 'FRONT',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/FRONT',
          },
          {
            classifier: 'BACK',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/BACK',
          },
        ],
      },
      {
        id: 'fakecredentialsid',
        category: 'FACEMAP',
        parts: [
          {
            classifier: 'FACEMAP',
          },
          {
            classifier: 'LIVENESS_1',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/LIVENESS_1',
          },
          {
            classifier: 'LIVENESS_3',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/LIVENESS_3',
          },
          {
            classifier: 'LIVENESS_2',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/LIVENESS_2',
          },
          {
            classifier: 'LIVENESS_5',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/LIVENESS_5',
          },
          {
            classifier: 'LIVENESS_4',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/LIVENESS_4',
          },
          {
            classifier: 'LIVENESS_6',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/LIVENESS_6',
          },
        ],
      },
      {
        id: 'fakecredentialsid',
        category: 'SELFIE',
        parts: [
          {
            classifier: 'FACE',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/credentials/fakecredentialsid/parts/FACE',
          },
        ],
      },
    ],
    decision: {
      type: decisionStatus,
      details: {
        label: 'PASSED',
      },
      risk: {
        score: 50,
      },
    },
    steps: {
      href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/workflow-executions/fakeworkflowid/steps',
    },
    capabilities: {
      extraction: [
        {
          id: '40cb204c-f7ff-43e7-864b-064dcc8aba85',
          credentials: [
            {
              id: 'fakecredentialsid',
              category: 'ID',
            },
          ],
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          data: {
            type: 'ID_CARD',
            subType: 'NATIONAL_ID',
            issuingCountry: idCountryCode,
            firstName: 'MUMBO',
            lastName: 'JUMBO',
            dateOfBirth: '1970-01-01',
            expiryDate: '2050-01-01',
            documentNumber: '1111111',
            optionalMrzField1: 'Z11',
            optionalMrzField2: '11111111',
            currentAge: '70',
          },
        },
      ],
      similarity: [
        {
          id: '594b92df-ae55-4123-883e-ce2724bda94d',
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
            type: 'PASSED',
            details: {
              label: 'MATCH',
            },
          },
          data: {
            similarity: 'MATCH',
          },
        },
      ],
      liveness: [
        {
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
              label: 'OK',
            },
          },
          data: {
            type: 'IPROOV_STANDARD',
            predictedAge: 31,
            ageConfidenceRange: '21-41',
          },
        },
      ],
      dataChecks: [
        {
          id: '07d10b79-b84a-454d-94ac-8b80d53f208a',
          credentials: [
            {
              id: 'fakecredentialsid',
              category: 'ID',
            },
          ],
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
        },
      ],
      imageChecks: [
        {
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
              label: 'REPEATED_FACE',
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
        },
      ],
      usability: [
        {
          id: 'ab66e806-87a7-4132-a677-8ae594d21fbd',
          credentials: [
            {
              id: 'fakecredentialsid',
              category: 'ID',
            },
          ],
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
        },
        {
          id: '93e6c38c-0917-40ef-9df5-3008fd83717f',
          credentials: [
            {
              id: 'fakecredentialsid',
              category: 'FACEMAP',
            },
          ],
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
        },
        {
          id: '53e1b87a-83f8-4d8b-a97d-6ad5b8bdfe9e',
          credentials: [
            {
              id: 'fakecredentialsid',
              category: 'SELFIE',
            },
          ],
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
        },
      ],
    },
  };
};
