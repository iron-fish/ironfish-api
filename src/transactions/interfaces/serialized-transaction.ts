/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JsonValue } from 'type-fest';
import { SerializedAssetDescription } from '../../asset-descriptions/interfaces/serialized-asset-description';

export interface SerializedTransaction {
  id: number;
  hash: string;
  fee: string;
  expiration?: number;
  seen_sequence: number | null;
  size: number;
  notes: JsonValue;
  spends: JsonValue;
  serialized: string | null;
  mints: SerializedAssetDescription[];
  burns: SerializedAssetDescription[];
  object: 'transaction';
}
