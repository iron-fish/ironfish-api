/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedTransaction } from '../interfaces/serialized-transaction';
import { Transaction } from '.prisma/client';

export function serializedTransactionFromRecord(
  transaction: Transaction,
): SerializedTransaction {
  return {
    id: transaction.id,
    hash: transaction.hash,
    fee: transaction.fee.toString(),
    size: transaction.size,
    timestamp: transaction.timestamp,
    block_id: transaction.block_id,
    notes: transaction.notes,
    spends: transaction.spends,
  };
}
