/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { serializedTransactionFromRecord } from '../../transactions/utils/transaction-translator';
import { SerializedBlock } from '../interfaces/serialized-block';
import { SerializedBlockWithTransactions } from '../interfaces/serialized-block-with-transactions';
import { Block, Transaction } from '.prisma/client';

export function serializedBlockFromRecord(block: Block): SerializedBlock {
  return {
    id: block.id,
    hash: block.hash,
    sequence: block.sequence,
    previous_block_hash: block.previous_block_hash,
    difficulty: block.difficulty,
    transactions_count: block.transactions_count,
    timestamp: block.timestamp,
    graffiti: block.graffiti,
    size: block.size,
  };
}

export function serializedBlockFromRecordWithTransactions(
  block: Block & { transactions: Transaction[] },
): SerializedBlockWithTransactions {
  const transactions = block.transactions.map((transaction) =>
    serializedTransactionFromRecord(transaction),
  );
  return {
    id: block.id,
    hash: block.hash,
    sequence: block.sequence,
    previous_block_hash: block.previous_block_hash,
    difficulty: block.difficulty,
    transactions_count: block.transactions_count,
    timestamp: block.timestamp,
    graffiti: block.graffiti,
    size: block.size,
    transactions,
  };
}
