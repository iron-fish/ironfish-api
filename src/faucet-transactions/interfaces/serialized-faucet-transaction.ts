/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface SerializedFaucetTransaction {
  object: 'faucet_transaction';
  id: number;
  public_key: string;
  started_at: string | null;
  completed_at: string | null;
  hash: string | null;
}
