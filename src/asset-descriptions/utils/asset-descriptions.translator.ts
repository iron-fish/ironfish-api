/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedAssetDescription } from '../interfaces/serialized-asset-description';
import { Asset, AssetDescription, Block, Transaction } from '.prisma/client';

export function serializedAssetDescriptionFromRecord(
  assetDescription: AssetDescription,
  asset: Asset,
  transaction: Transaction,
): SerializedAssetDescription {
  return {
    object: 'asset_description',
    id: assetDescription.id,
    transaction_hash: transaction.hash,
    type: assetDescription.type,
    value: assetDescription.value.toString(),
    asset: {
      identifier: asset.identifier,
      name: asset.name,
    },
  };
}

export function serializedAssetDescriptionWithTimestampFromRecord(
  assetDescription: AssetDescription,
  asset: Asset,
  transaction: Transaction,
  block: Block,
): SerializedAssetDescription {
  return {
    object: 'asset_description',
    id: assetDescription.id,
    block_timestamp: block.timestamp.toISOString(),
    transaction_hash: transaction.hash,
    type: assetDescription.type,
    value: assetDescription.value.toString(),
    asset: {
      identifier: asset.identifier,
      name: asset.name,
    },
  };
}
