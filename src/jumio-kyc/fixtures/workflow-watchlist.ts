/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  JumioTransactionRetrieveResponse,
  WatchlistScreeningLabels,
} from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const WORKFLOW_RETRIEVE_WATCHLIST = (
  watchlistLabel: WatchlistScreeningLabels,
): JumioTransactionRetrieveResponse => {
  return {
    workflow: {
      id: 'b94de56f-75b7-4df2-9320-eebba497f138',
      status: 'PROCESSED',
      definitionKey: '10010',
      userReference: 'foo',
      customerInternalReference: 'application',
    },
    account: {
      id: 'aefa1cc2-011a-4615-8e7d-fdcaddb508cd',
    },
    createdAt: '2023-03-10T04:30:53.529Z',
    startedAt: '2023-03-10T04:37:21.775Z',
    completedAt: '2023-03-10T04:37:23.104Z',
    credentials: [
      {
        id: '0aa24a7c-ce41-4647-8b87-c0ed5d657da7',
        category: 'DATA',
        parts: [
          {
            classifier: 'PREPARED_DATA',
            href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/aefa1cc2-011a-4615-8e7d-fdcaddb508cd/credentials/0aa24a7c-ce41-4647-8b87-c0ed5d657da7/parts/PREPARED_DATA',
          },
        ],
      },
    ],
    decision: {
      type: 'PASSED',
      details: {
        label: 'OK',
      },
      risk: {
        score: 50.0,
      },
    },
    steps: {
      href: 'https://retrieval.amer-1.jumio.ai/api/v1/accounts/aefa1cc2-011a-4615-8e7d-fdcaddb508cd/workflow-executions/b94de56f-75b7-4df2-9320-eebba497f138/steps',
    },
    capabilities: {
      watchlistScreening: [
        {
          id: '17b614a5-6cc4-4d20-a63b-55de146cf1c6',
          credentials: [
            {
              id: '0aa24a7c-ce41-4647-8b87-c0ed5d657da7',
              category: 'DATA',
            },
          ],
          decision: {
            type: 'WARNING',
            details: {
              label: watchlistLabel,
            },
          },
          data: {
            searchDate: '2023-03-10T04:37:22.000Z',
            searchId: '1232090652',
            searchReference: '1678423042-32DnQzv3',
            searchResultUrl:
              'https://app.complyadvantage.com/public/search/13/b0',
            searchResults: 1,
            searchStatus: 'SUCCESS',
          },
        },
      ],
    },
  };
};
