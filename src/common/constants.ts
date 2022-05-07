/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { EventType } from '.prisma/client';

export const DAYS_IN_WEEK = 7;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Pagination limits
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Node uptime
export const NODE_UPTIME_CHECKIN_HOURS = 1; // Check-in can happen once per hour
export const NODE_UPTIME_CREDIT_HOURS = 12; // Credit in 12 hour chunks

// Send Transaction
export const ORE_TO_IRON = 100000000;
export const SEND_TRANSACTION_LIMIT_ORE = ORE_TO_IRON * 0.1; // Only transactions >= to this amount will get points

// Event categories
export const WEEKLY_POINT_LIMITS_BY_EVENT_TYPE: Record<EventType, number> = {
  [EventType.BLOCK_MINED]: 1000,
  [EventType.BUG_CAUGHT]: 1000,
  [EventType.COMMUNITY_CONTRIBUTION]: 2000,
  [EventType.PULL_REQUEST_MERGED]: 5000,
  [EventType.SOCIAL_MEDIA_PROMOTION]: 1000,
  [EventType.NODE_UPTIME]: 140,
  [EventType.SEND_TRANSACTION]: Number.MAX_VALUE,
};

export const POINTS_PER_CATEGORY: Record<EventType, number> = {
  [EventType.BLOCK_MINED]: 100,
  [EventType.BUG_CAUGHT]: 100,
  [EventType.COMMUNITY_CONTRIBUTION]: 1000,
  [EventType.PULL_REQUEST_MERGED]: 500,
  [EventType.SOCIAL_MEDIA_PROMOTION]: 100,
  [EventType.NODE_UPTIME]: 10,
  [EventType.SEND_TRANSACTION]: 1,
};
