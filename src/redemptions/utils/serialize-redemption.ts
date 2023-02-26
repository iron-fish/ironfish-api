/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Redemption } from '@prisma/client';
import { SerializedRedemption } from '../interfaces/serializedRedemption';

export function serializeRedemption(
  redemption: Redemption,
): SerializedRedemption {
  return {
    object: 'redemption',
    id: redemption.id,
    created_at: redemption.created_at.toString(),
    updated_at: redemption.updated_at.toString(),
    user_id: redemption.user_id,
    kyc_attempts: redemption.kyc_attempts,
    kyc_status: redemption.kyc_status,
    jumio_account_id: redemption.jumio_account_id,
    public_address: redemption.public_address,
    email_verified: redemption.email_verified,
  };
}
