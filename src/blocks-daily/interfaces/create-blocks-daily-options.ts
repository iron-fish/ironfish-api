/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Prisma } from '@prisma/client';

export interface CreateBlocksDailyOptions {
  averageBlockTimeMs: number;
  averageDifficulty: Prisma.Decimal;
  averageBlockSize: Prisma.Decimal;
  blocksCount: number;
  blocksWithGraffitiCount: number;
  chainSequence: number;
  cumulativeUniqueGraffiti: number;
  date: Date;
  transactionsCount: number;
  uniqueGraffiti: number;
}
