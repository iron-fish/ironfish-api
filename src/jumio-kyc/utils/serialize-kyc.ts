/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { KycStatus, Redemption } from '@prisma/client';
import { SerializedKyc } from '../interfaces/serialized-kyc';

export function serializeKyc(
  redemption: Redemption,
  jumio_account_id: string,
  kyc_status: KycStatus,
  jumio_web_href: string,
  jumio_workflow_execution_id: string,
): SerializedKyc {
  return {
    redemption_id: redemption.id,
    user_id: redemption.user_id,
    kyc_attempts: redemption.kyc_attempts,
    kyc_status: kyc_status,
    jumio_account_id: jumio_account_id,
    jumio_workflow_execution_id: jumio_workflow_execution_id,
    jumio_web_href: jumio_web_href,
    public_address: redemption.public_address,
  };
}
