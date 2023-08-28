/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { VerifiedAssetMetadata } from '@prisma/client';

export interface SerializedAsset {
  object: 'asset';
  created_transaction_hash: string;
  created_transaction_timestamp: string;
  id: number;
  identifier: string;
  metadata: string;
  name: string;
  creator: string;
  owner: string;
  supply: string;
  verified_metadata: SerializedVerifiedAssetMetadata | null;
  // @deprecated Use `verified_metadata` instead
  verified_at: string | null;
}

export interface SerializedVerifiedAssetMetadata {
  created_at: string;
  updated_at: string;
  symbol: string;
  decimals?: number;
  logo_uri?: string;
  website?: string;
}

export function serializeVerifiedAssetMetadata(
  m: VerifiedAssetMetadata,
): SerializedVerifiedAssetMetadata {
  return {
    created_at: m.created_at.toISOString(),
    updated_at: m.updated_at.toISOString(),
    symbol: m.symbol,
    ...(m.decimals != null && { decimals: m.decimals }),
    ...(m.logo_uri != null && { logoURI: m.logo_uri }),
    ...(m.website != null && { website: m.website }),
  };
}
