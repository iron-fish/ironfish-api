/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { KycStatus } from '@prisma/client';

export interface SerializedKyc {
  redemption_id: number;
  user_id: number;
  kyc_attempts: number;
  kyc_status: KycStatus;
  kyc_max_attempts: number;
  jumio_account_id: string;
  jumio_workflow_execution_id: string;
  jumio_web_href: string;
  public_address: string;
  can_attempt: boolean;
  can_attempt_reason: string;
  can_create: boolean;
  can_create_reason: string;
  help_url: string;
}
