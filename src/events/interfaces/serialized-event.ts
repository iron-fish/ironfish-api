/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { EventType } from '.prisma/client';

export interface SerializedEvent {
  object: 'event';
  id: number;
  type: EventType;
  occurred_at: string;
  points: number;
  user_id: number;
}
