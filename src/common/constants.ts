/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { EventType } from '.prisma/client';

export const DAYS_IN_WEEK = 7;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Pagination limits
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Event categories
export const WEEKLY_POINT_LIMITS_BY_EVENT_TYPE: Record<EventType, number> = {
  [EventType.BLOCK_MINED]: 1000,
  [EventType.BUG_CAUGHT]: 1000,
  [EventType.COMMUNITY_CONTRIBUTION]: 2000,
  [EventType.PULL_REQUEST_MERGED]: 5000,
  [EventType.SOCIAL_MEDIA_PROMOTION]: 1000,
};

export const POINTS_PER_CATEGORY: Record<EventType, number> = {
  [EventType.BLOCK_MINED]: 100,
  [EventType.BUG_CAUGHT]: 100,
  [EventType.COMMUNITY_CONTRIBUTION]: 1000,
  [EventType.PULL_REQUEST_MERGED]: 500,
  [EventType.SOCIAL_MEDIA_PROMOTION]: 100,
};
