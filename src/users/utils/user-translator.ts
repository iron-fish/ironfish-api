/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedUser } from '../interfaces/serialized-user';
import { SerializedUserWithRank } from '../interfaces/serialized-user-with-rank';
import { User, UserPoints } from '.prisma/client';

export function serializedUserFromRecord(
  user: User,
  userPoints: UserPoints,
): SerializedUser {
  return {
    id: user.id,
    country_code: user.country_code,
    graffiti: user.graffiti,
    verified: user.last_login_at != null,
    node_uptime_count: userPoints.node_uptime_count,
    //this is one week of node_uptime. Being slightly lazy here and hardcoding because this will live for a month
    node_uptime_threshold: 14,
    total_points: userPoints.total_points,
    created_at: user.created_at.toISOString(),
  };
}

export function serializedUserFromRecordWithRank(
  user: User,
  userPoints: UserPoints,
  rank: number,
): SerializedUserWithRank {
  return {
    id: user.id,
    country_code: user.country_code,
    graffiti: user.graffiti,
    verified: user.last_login_at != null,
    node_uptime_count: userPoints.node_uptime_count,
    node_uptime_threshold: 14,
    total_points: userPoints.total_points,
    created_at: user.created_at.toISOString(),
    rank,
  };
}
