/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { serializedBlockFromRecord } from '../../blocks/utils/block-translator';
import { SerializedTransaction } from '../interfaces/serialized-transaction';
import { SerializedTransactionWithBlocks } from '../interfaces/serialized-transaction-with-blocks';
import { Transaction } from '.prisma/client';
import { Block } from '.prisma/client';

export function serializedTransactionFromRecord(
  transaction: Transaction,
): SerializedTransaction {
  return {
    id: transaction.id,
    hash: transaction.hash,
    fee: transaction.fee.toString(),
    size: transaction.size,
    timestamp: transaction.timestamp.toISOString(),
    notes: transaction.notes,
    spends: transaction.spends,
    object: 'transaction',
  };
}

export function serializedTransactionFromRecordWithBlocks(
  transaction: Transaction & { blocks: Block[] },
): SerializedTransactionWithBlocks {
  const blocks = transaction.blocks.map((block) =>
    serializedBlockFromRecord(block),
  );
  return {
    id: transaction.id,
    hash: transaction.hash,
    fee: transaction.fee.toString(),
    size: transaction.size,
    timestamp: transaction.timestamp.toISOString(),
    notes: transaction.notes,
    spends: transaction.spends,
    object: 'transaction',
    blocks,
  };
}
