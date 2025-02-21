/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface UpsertTransactionOptions {
  hash: string;
  fee: number;
  serialized?: string;
  expiration?: number;
  seen_sequence?: number;
  size: number;
  notes: Note[];
  spends: Spend[];
  serialized?: string;
}

interface Note {
  commitment: string;
}

interface Spend {
  nullifier: string;
}
