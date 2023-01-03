/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Deposit, EventType, MultiAsset } from '.prisma/client';

export interface CreateEventOptions {
  blockId?: number;
  occurredAt?: Date;
  points?: number;
  type: EventType;
  userId: number;
  url?: string;
  deposit?: Deposit;
  mulitAsset?: MultiAsset;
}
