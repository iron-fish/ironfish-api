/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedBlockMetrics } from '../interfaces/serialized-block-metrics';
import { BlockDaily } from '.prisma/client';

export function serializedBlockMetricsFromRecord(
  record: BlockDaily,
): SerializedBlockMetrics {
  return {
    object: 'block_metrics',
    average_block_time_ms: record.average_block_time_ms,
    average_difficulty: Number(record.average_difficulty_millis / BigInt(1000)),
    blocks_count: record.blocks_count,
    blocks_with_graffiti_count: record.blocks_with_graffiti_count,
    chain_sequence: record.chain_sequence,
    cumulative_unique_graffiti: record.cumulative_unique_graffiti,
    date: record.date.toISOString(),
    transactions_count: record.transactions_count,
    unique_graffiti_count: record.unique_graffiti_count,
  };
}
