/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface SerializedAsset {
  object: 'asset';
  created_transaction_hash: string;
  created_transaction_timestamp: string;
  id: number;
  identifier: string;
  metadata: string;
  name: string;
  owner: string;
  supply: string;
}
