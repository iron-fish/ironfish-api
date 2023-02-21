/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AssetDescriptionType } from '@prisma/client';

export interface SerializedAssetDescription {
  object: 'asset_description';
  id: number;
  transaction_hash: string;
  type: AssetDescriptionType;
  value: string;
}

export interface SerializedAssetDescriptionWithTimestamp
  extends SerializedAssetDescription {
  timestamp: string;
}
