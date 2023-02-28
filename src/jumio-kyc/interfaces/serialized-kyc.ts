/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { KycStatus } from '@prisma/client';

export interface SerializedKyc {
  object: 'kyc';
  redemption_id: number;
  user_id: number;
  kyc_attempts: number;
  kyc_status: KycStatus;
  jumio_account_id: string;
  jumio_workflow_execution_id: string;
  jumio_web_href: string;
  public_address: string;
}
