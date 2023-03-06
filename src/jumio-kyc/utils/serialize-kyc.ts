/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { JumioTransaction, Redemption } from '@prisma/client';
import assert from 'assert';
import { ApiConfigService } from '../../api-config/api-config.service';
import { SerializedKyc } from '../interfaces/serialized-kyc';

export function serializeKyc(
  redemption: Redemption,
  transaction: JumioTransaction,
  canAttempt: boolean,
  canAttemptReason: string,
  canCreate: boolean,
  canCreateReason: string,
  config: ApiConfigService,
): SerializedKyc {
  assert.ok(redemption.jumio_account_id);

  const maxAttempts =
    redemption.kyc_max_attempts ?? config.get<number>('KYC_MAX_ATTEMPTS');

  return {
    redemption_id: redemption.id,
    user_id: redemption.user_id,
    kyc_max_attempts: maxAttempts,
    kyc_attempts: redemption.kyc_attempts,
    kyc_status: redemption.kyc_status,
    jumio_account_id: redemption.jumio_account_id,
    public_address: redemption.public_address,
    jumio_workflow_execution_id: transaction.workflow_execution_id,
    jumio_web_href: transaction.web_href,
    can_attempt: canAttempt,
    can_attempt_reason: canAttemptReason,
    can_create: canCreate,
    can_create_reason: canCreateReason,
  };
}
