/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface CreateBlocksDailyOptions {
  averageBlockTimeMs: number;
  averageDifficultyMillis: bigint;
  blocksCount: number;
  blocksWithGraffitiCount: number;
  chainSequence: number;
  cumulativeUniqueGraffiti: number;
  date: Date;
  transactionsCount: number;
  uniqueGraffiti: number;
}
