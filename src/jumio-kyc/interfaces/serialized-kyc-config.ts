/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface SerializedKycConfig {
  data: {
    airdrop_completed_by: Date;
    coins: number;
    kyc_completed_by: Date;
    name: string;
    pool_name: string;
  }[];
}
