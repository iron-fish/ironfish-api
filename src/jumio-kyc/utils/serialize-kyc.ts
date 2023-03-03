/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransaction, Redemption } from '@prisma/client';
import assert from 'assert';
import { SerializedKyc } from '../interfaces/serialized-kyc';

export function serializeKyc(
  redemption: Redemption,
  transaction: JumioTransaction,
  can_attempt: boolean,
): SerializedKyc {
  assert.ok(redemption.jumio_account_id);

  return {
    redemption_id: redemption.id,
    user_id: redemption.user_id,
    kyc_attempts: redemption.kyc_attempts,
    kyc_status: redemption.kyc_status,
    jumio_account_id: redemption.jumio_account_id,
    public_address: redemption.public_address,
    jumio_workflow_execution_id: transaction.workflow_execution_id,
    jumio_web_href: transaction.web_href,
    can_attempt: can_attempt,
  };
}
