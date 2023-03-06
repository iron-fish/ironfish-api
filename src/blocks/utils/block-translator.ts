/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedTransaction } from '../../transactions/interfaces/serialized-transaction';
import { SerializedBlock } from '../interfaces/serialized-block';
import { SerializedBlockWithTransactions } from '../interfaces/serialized-block-with-transactions';
import { Block } from '.prisma/client';

export function serializedBlockFromRecord(block: Block): SerializedBlock {
  return {
    id: block.id,
    hash: block.hash,
    sequence: block.sequence,
    previous_block_hash: block.previous_block_hash,
    main: block.main,
    difficulty: Number(block.difficulty),
    transactions_count: block.transactions_count,
    timestamp: block.timestamp.toISOString(),
    graffiti: block.graffiti,
    size: block.size,
    time_since_last_block_ms: block.time_since_last_block_ms,
    object: 'block',
  };
}

export function serializedBlockFromRecordWithTransactions(
  block: Block,
  transactions: SerializedTransaction[],
): SerializedBlockWithTransactions {
  return {
    id: block.id,
    hash: block.hash,
    sequence: block.sequence,
    previous_block_hash: block.previous_block_hash,
    main: block.main,
    difficulty: Number(block.difficulty),
    transactions_count: block.transactions_count,
    timestamp: block.timestamp.toISOString(),
    graffiti: block.graffiti,
    size: block.size,
    time_since_last_block_ms: block.time_since_last_block_ms,
    object: 'block',
    transactions,
  };
}
