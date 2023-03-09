/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { WatchlistScreenCheck } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

export const WATCHLIST_SCREEN_FIXTURE = (
  decisionLabel = 'OK',
  searchResults = 0,
): WatchlistScreenCheck => {
  return {
    id: 'c2edb5ae-73ae-400b-a102-3008827b4aaa',
    credentials: [
      {
        id: 'c01e3433-7e82-4a9e-8686-856af8e903f2',
        category: 'ID',
      },
    ],
    decision: {
      type: 'PASSED',
      details: {
        label: decisionLabel,
      },
    },
    data: {
      searchDate: '2023-03-09T21:51:12.000Z',
      searchId: '1231916038',
      searchReference: '1678398672-eqPQV8pR',
      searchResultUrl:
        'https://app.complyadvantage.com/public/search/1678398672-eqPQV8pR/9fc65fef73fb',
      searchResults: searchResults,
      searchStatus: 'SUCCESS',
    },
  } as WatchlistScreenCheck;
};
