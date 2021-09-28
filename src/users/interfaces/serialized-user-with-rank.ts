/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { EventType } from '.prisma/client';
import { SerializedUser } from './serialized-user';

export interface SerializedUserWithRank extends SerializedUser {
  rank: number;
}

export interface SerializedUserWithRankAndType extends SerializedUserWithRank {
  event_type: EventType;
}
