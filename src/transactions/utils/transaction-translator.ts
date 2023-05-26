/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedAssetDescription } from '../../asset-descriptions/interfaces/serialized-asset-description';
import { serializedAssetDescriptionFromRecord } from '../../asset-descriptions/utils/asset-descriptions.translator';
import { serializedBlockFromRecord } from '../../blocks/utils/block-translator';
import { SerializedTransaction } from '../interfaces/serialized-transaction';
import { SerializedTransactionWithBlocks } from '../interfaces/serialized-transaction-with-blocks';
import {
  Asset,
  AssetDescription,
  AssetDescriptionType,
  Block,
  Transaction,
} from '.prisma/client';

export function serializedTransactionFromRecord(
  transaction: Transaction,
  assetDescriptions: { asset: Asset; assetDescription: AssetDescription }[],
): SerializedTransaction {
  const { mints, burns } = mintsAndBurnsFromAssetDescriptions(
    transaction,
    assetDescriptions,
  );
  return {
    id: transaction.id,
    hash: transaction.hash,
    fee: transaction.fee.toString(),
    ...(transaction.expiration ? { expiration: transaction.expiration } : {}),
    size: transaction.size,
    notes: transaction.notes,
    spends: transaction.spends,
    mints,
    burns,
    object: 'transaction',
  };
}

export function serializedTransactionFromRecordWithBlocks(
  transaction: Transaction & { blocks: Block[] },
  assetDescriptions: { asset: Asset; assetDescription: AssetDescription }[],
): SerializedTransactionWithBlocks {
  const serializedTransaction = serializedTransactionFromRecord(
    transaction,
    assetDescriptions,
  );

  return {
    ...serializedTransaction,
    blocks: transaction.blocks.map((block) => serializedBlockFromRecord(block)),
  };
}

function mintsAndBurnsFromAssetDescriptions(
  transaction: Transaction,
  assetDescriptions: { asset: Asset; assetDescription: AssetDescription }[],
): {
  mints: SerializedAssetDescription[];
  burns: SerializedAssetDescription[];
} {
  const mints = [];
  const burns = [];

  for (const { asset, assetDescription } of assetDescriptions) {
    if (assetDescription.type === AssetDescriptionType.MINT) {
      mints.push(
        serializedAssetDescriptionFromRecord(
          assetDescription,
          asset,
          transaction,
        ),
      );
    } else {
      burns.push(
        serializedAssetDescriptionFromRecord(
          assetDescription,
          asset,
          transaction,
        ),
      );
    }
  }

  return {
    mints,
    burns,
  };
}
