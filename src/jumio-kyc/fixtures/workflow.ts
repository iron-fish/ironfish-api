/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DecisionStatus } from '@prisma/client';
import {
  ExtractionCheck,
  ImageCheck,
  JumioTransactionRetrieveResponse,
  LivenessCheck,
  WatchlistScreenCheck,
  WorkflowStatus,
} from '../../jumio-api/interfaces/jumio-transaction-retrieve';
import { EXTRACTION_CHECK_FIXTURE } from './extraction-check';
import { IMAGE_CHECK_FIXTURE } from './image-check';
import { LIVENESS_CHECK_FIXTURE } from './liveness-check';
import { WATCHLIST_SCREEN_FIXTURE } from './watch-list';

export type JumioWorkflowRetrieveParams = {
  workflowStatus?: WorkflowStatus;
  workflowId?: string;
  accountId?: string;
  decisionStatus?: DecisionStatus;
  userId?: string;
  imageCheck?: ImageCheck;
  watchlistCheck?: WatchlistScreenCheck;
  livenessCheck?: LivenessCheck;
  extractionCheck?: ExtractionCheck;
  riskScore?: number;
};
export const WORKFLOW_RETRIEVE_FIXTURE = ({
  workflowStatus = 'PROCESSED',
  decisionStatus = DecisionStatus.PASSED,
  riskScore = 50,
  workflowId = 'eb776622-26a2-499b-b824-6449c92d1617',
  accountId = '684fcf21-bcf3-4916-b007-35dc70102f56',
  userId = '1',
  extractionCheck = EXTRACTION_CHECK_FIXTURE(),
  imageCheck = IMAGE_CHECK_FIXTURE(),
  watchlistCheck = WATCHLIST_SCREEN_FIXTURE(),
  livenessCheck = LIVENESS_CHECK_FIXTURE(),
}: JumioWorkflowRetrieveParams = {}): JumioTransactionRetrieveResponse => {
  return {
    workflow: {
      id: workflowId,
      status: workflowStatus,
      definitionKey: '10013',
      userReference: 'foobar',
      customerInternalReference: userId,
    },
    account: {
      id: accountId,
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
        score: riskScore,
      },
    },
    steps: {
      href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/fakeaccountid/workflow-executions/fakeworkflowid/steps',
    },
    capabilities: {
      extraction: [extractionCheck],
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
      liveness: [livenessCheck],
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
      imageChecks: [imageCheck],
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
      watchlistScreening: [watchlistCheck],
    },
  };
};
