/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedUser } from '../interfaces/serialized-user';
import { User } from '.prisma/client';

export function serializedUserFromRecord(
  user: User,
  rank: number,
): SerializedUser {
  return {
    id: user.id,
    country_code: user.country_code,
    graffiti: user.graffiti,
    total_points: user.total_points,
    last_login_at: user.last_login_at,
    rank,
  };
}
