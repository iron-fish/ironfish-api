/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface SerializedBlockMetrics {
  object: 'block_metrics';
  average_block_time_ms: number;
  average_difficulty: number;
  average_block_size: number;
  blocks_count: number;
  blocks_with_graffiti_count: number;
  chain_sequence: number;
  cumulative_unique_graffiti: number;
  date: string;
  transactions_count: number;
  unique_graffiti_count: number;
}
