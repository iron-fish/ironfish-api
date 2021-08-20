/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedUser } from './serialized-user';

export interface SerializedUserWithRank extends SerializedUser {
  rank: number;
}
