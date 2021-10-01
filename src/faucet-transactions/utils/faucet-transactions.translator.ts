/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedFaucetTransaction } from '../interfaces/serialized-faucet-transaction';
import { FaucetTransaction } from '.prisma/client';

export function serializedFaucetTransactionFromRecord(
  faucetTransaction: FaucetTransaction,
): SerializedFaucetTransaction {
  const { id, public_key, completed_at, started_at } = faucetTransaction;
  return {
    object: 'faucet_transaction',
    id,
    public_key,
    completed_at: completed_at ? completed_at.toISOString() : null,
    started_at: started_at ? started_at.toISOString() : null,
  };
}
