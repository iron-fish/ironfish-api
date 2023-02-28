/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { KycStatus } from '@prisma/client';

export interface SerializedRedemption {
  object: 'redemption';
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  kyc_attempts: number;
  kyc_status: KycStatus;
  jumio_account_id: string | null;
  public_address: string;
}
