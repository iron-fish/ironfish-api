/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BlockOperation } from '../enums/block-operation';

export interface UpsertBlockOptions {
  hash: string;
  sequence: number;
  difficulty: number;
  work?: bigint;
  type: BlockOperation;
  timestamp: Date;
  transactionsCount: number;
  graffiti: string;
  size: number;
  previousBlockHash: string;
  timeSinceLastBlockMs?: number;
}
