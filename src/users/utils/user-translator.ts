/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedUser } from '../interfaces/serialized-user';
import { SerializedUserWithRank } from '../interfaces/serialized-user-with-rank';
import { User } from '.prisma/client';

export function serializedUserFromRecord(user: User): SerializedUser {
  return {
    id: user.id,
    country_code: user.country_code,
    graffiti: user.graffiti,
    total_points: user.total_points,
  };
}

export function serializedUserFromRecordWithRank(
  user: User,
  rank: number,
): SerializedUserWithRank {
  return {
    id: user.id,
    country_code: user.country_code,
    graffiti: user.graffiti,
    total_points: user.total_points,
    rank,
  };
}
