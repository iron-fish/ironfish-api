/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface SerializedUser {
  id: number;
  graffiti: string;
  total_points: number;
  is_verified: boolean;
  node_uptime_score: number;
  country_code: string;
  created_at: string;
}
