/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { matchApprovedLabels } from './approve-list';
import { APPROVED_LIVENESS_FAILURE_FIXTURE } from './fixtures/approved-liveness-failure';

describe('approve-list', () => {
  it('should allow benign liveness failure', () => {
    const matched = matchApprovedLabels(APPROVED_LIVENESS_FAILURE_FIXTURE);
    expect(matched).toBe(
      '{"maxRiskScore":50,"usabilityLabels":["NOT_UPLOADED","OK"],"livenessLabels":["BAD_QUALITY","OK"]}',
    );
  });
});
