/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransactionRetrieveResponse } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const APPROVED_LIVENESS_FAILURE_FIXTURE: JumioTransactionRetrieveResponse =
  {
    steps: {
      href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/452447de-a332-40f1-86bd-a08f5d895fdd/workflow-executions/eb4d4e08-f07a-4ee1-8b0a-878238caea0d/steps',
    },
    account: {
      id: '452447de-a332-40f1-86bd-a08f5d895fdd',
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
      id: 'eb4d4e08-f07a-4ee1-8b0a-878238caea0d',
      status: 'PROCESSED',
      definitionKey: '10013',
      userReference:
        't=1679720204392,v1=9060321c2ac9b93ad9fe80ecdc002881986dd54df32cbbf0d0bd256d77ad55e5',
      customerInternalReference: '299166',
    },
    createdAt: '2023-03-25T04:56:44.461Z',
    startedAt: '2023-03-25T04:58:15.862Z',
    completedAt: '2023-03-25T04:58:32.835Z',
    credentials: [
      {
        id: '6a8a6b9d-b14f-4cd8-bd71-e7919d37c487',
        category: 'FACEMAP',
      },
      {
        id: '9770ed12-82c5-4426-afb4-29997ab9d405',
        parts: [
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/452447de-a332-40f1-86bd-a08f5d895fdd/credentials/9770ed12-82c5-4426-afb4-29997ab9d405/parts/FRONT',
            classifier: 'FRONT',
          },
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/452447de-a332-40f1-86bd-a08f5d895fdd/credentials/9770ed12-82c5-4426-afb4-29997ab9d405/parts/BACK',
            classifier: 'BACK',
          },
        ],
        category: 'ID',
      },
      {
        id: '5216d4d0-7f83-43bc-b457-ba3ac22fb9f7',
        parts: [
          {
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/452447de-a332-40f1-86bd-a08f5d895fdd/credentials/5216d4d0-7f83-43bc-b457-ba3ac22fb9f7/parts/FACE',
            classifier: 'FACE',
          },
        ],
        category: 'SELFIE',
      },
    ],
    capabilities: {
      liveness: [
        {
          id: '7ebd3a4f-5508-462e-89bd-989a68c6dda6',
          decision: {
            type: 'WARNING',
            details: {
              label: 'BAD_QUALITY',
            },
          },
          credentials: [
            {
              id: '6a8a6b9d-b14f-4cd8-bd71-e7919d37c487',
              category: 'FACEMAP',
            },
            {
              id: '5216d4d0-7f83-43bc-b457-ba3ac22fb9f7',
              category: 'SELFIE',
            },
          ],
        },
      ],
      usability: [
        {
          id: '5627f6a0-dee8-4999-9a5c-42b2c53c9f75',
          decision: {
            type: 'NOT_EXECUTED',
            details: {
              label: 'NOT_UPLOADED',
            },
          },
          credentials: [
            {
              id: '6a8a6b9d-b14f-4cd8-bd71-e7919d37c487',
              category: 'FACEMAP',
            },
          ],
        },
        {
          id: 'ccc4f6dd-9c5a-4b55-a77c-463ecf0f714b',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '9770ed12-82c5-4426-afb4-29997ab9d405',
              category: 'ID',
            },
          ],
        },
        {
          id: '81e4b8db-e380-46c5-b741-6002628ddc20',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '5216d4d0-7f83-43bc-b457-ba3ac22fb9f7',
              category: 'SELFIE',
            },
          ],
        },
      ],
      dataChecks: [
        {
          id: '127f512e-2812-41c5-bae1-c047d3b05636',
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '9770ed12-82c5-4426-afb4-29997ab9d405',
              category: 'ID',
            },
          ],
        },
      ],
      extraction: [
        {
          id: '02b16259-f996-4e8c-aad8-a7d8f812e5cd',
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
              id: '9770ed12-82c5-4426-afb4-29997ab9d405',
              category: 'ID',
            },
          ],
        },
      ],
      similarity: [
        {
          id: '45ff3a49-37fa-42b1-ad4b-28d3f897e358',
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
              id: '9770ed12-82c5-4426-afb4-29997ab9d405',
              category: 'ID',
            },
            {
              id: '5216d4d0-7f83-43bc-b457-ba3ac22fb9f7',
              category: 'SELFIE',
            },
          ],
        },
      ],
      imageChecks: [
        {
          id: '379df6f9-4c72-4194-b32c-31a334c71633',
          data: {
            faceSearchFindings: {
              status: 'DONE',
              findings: [
                '12ebff68-c345-452e-9b3f-6089b876fd83',
                'b7d54096-c827-4bd7-bbad-3ee12564206b',
                '637a2aae-8f70-4192-8123-28e38b30207b',
                '0c1449b1-8e6c-4a29-814f-e814433694e8',
                'c9b403b5-7ea0-4232-9951-a6c63cd4b164',
                'c54945a2-51b7-4b2b-b0ef-7e3951d526d2',
                '3ccacfe1-edf6-4def-88fd-fb1e7253fc15',
                'ffe5dc38-dcee-4c07-a01b-d68798ead961',
                '03fc2090-fbd6-4f2b-bb0a-8bd3e1ee540e',
                '906f8d0f-a879-4f44-becd-49e25799a600',
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
              id: '9770ed12-82c5-4426-afb4-29997ab9d405',
              category: 'ID',
            },
            {
              id: '5216d4d0-7f83-43bc-b457-ba3ac22fb9f7',
              category: 'SELFIE',
            },
          ],
        },
      ],
      watchlistScreening: [
        {
          id: '97e0370e-c463-45eb-bc81-33860605e8e4',
          data: {
            searchId: '1249361708',
            searchDate: '2023-03-25T04:58:32.000Z',
            searchStatus: 'SUCCESS',
            searchResults: 0,
            searchReference: '1679720312-xNZ5nUee',
            searchResultUrl:
              'https://app.complyadvantage.com/public/search/1679720312-xNZ5nUee/b305adc99746',
          },
          decision: {
            type: 'PASSED',
            details: {
              label: 'OK',
            },
          },
          credentials: [
            {
              id: '9770ed12-82c5-4426-afb4-29997ab9d405',
              category: 'ID',
            },
          ],
        },
      ],
    },
  };
