/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface SerializedBlock {
  id: number;
  hash: string;
  sequence: number;
  previous_block_hash: string | null;
  difficulty: number;
  transactions_count: number;
  timestamp: string;
  graffiti: string | null;
  size: number | null;
  object: string;
}
