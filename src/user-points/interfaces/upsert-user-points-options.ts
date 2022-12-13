/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { EventType } from '.prisma/client';

export interface UserPointsOptions {
  points: number;
  count: number;
  latestOccurredAt: Date | null;
}

export interface UpsertUserPointsOptions {
  userId: number;
  points?: Partial<Record<EventType, UserPointsOptions>>;
  totalPoints?: number;
}
