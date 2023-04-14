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
export const MAX_POINT_BLOCK_SEQUENCE = 252200; // When we increased the max points from 0.1 to a configuration
export const ENABLE_DEPOSIT_BLOCK_SEQUENCE = 288_888; // When deposits should be turned off

// Event categories
export const WEEKLY_POINT_LIMITS_BY_EVENT_TYPE: Record<EventType, number> = {
  [EventType.BLOCK_MINED]: 1000,
  [EventType.BUG_CAUGHT]: 1000,
  [EventType.COMMUNITY_CONTRIBUTION]: 2000,
  [EventType.PULL_REQUEST_MERGED]: 5000,
  [EventType.SOCIAL_MEDIA_PROMOTION]: 1000,
  [EventType.NODE_UPTIME]: 140,
  [EventType.SEND_TRANSACTION]: Number.MAX_VALUE,
  [EventType.MULTI_ASSET_TRANSFER]: 200,
  [EventType.MULTI_ASSET_MINT]: 200,
  [EventType.MULTI_ASSET_BURN]: 200,
  [EventType.POOL4]: 0,
};

export const POINTS_PER_CATEGORY: Record<EventType, number> = {
  [EventType.BLOCK_MINED]: 100,
  [EventType.BUG_CAUGHT]: 100,
  [EventType.COMMUNITY_CONTRIBUTION]: 1000,
  [EventType.PULL_REQUEST_MERGED]: 500,
  [EventType.SOCIAL_MEDIA_PROMOTION]: 100,
  [EventType.NODE_UPTIME]: 10,
  [EventType.SEND_TRANSACTION]: 1,
  [EventType.MULTI_ASSET_TRANSFER]: 200,
  [EventType.MULTI_ASSET_MINT]: 200,
  [EventType.MULTI_ASSET_BURN]: 200,
  [EventType.POOL4]: 0,
};

export const POOL_4_CATEGORIES: Array<EventType> = [
  EventType.BUG_CAUGHT,
  EventType.NODE_UPTIME,
  EventType.MULTI_ASSET_MINT,
  EventType.MULTI_ASSET_BURN,
  EventType.MULTI_ASSET_TRANSFER,
];

// 2023 Feb 26 12 AM UTC
export const PHASE_3_END = new Date(Date.UTC(2023, 1, 26, 0, 0, 0));
export const KYC_DEADLINE = new Date(Date.UTC(2023, 3, 15, 0, 0, 0));
export const AIRDROP_DEADLINE = new Date(Date.UTC(2023, 3, 21, 0, 0, 0));

export const POOL1_TOKENS = 420000;
export const POOL2_TOKENS = 210000;
export const POOL3_TOKENS = 105000;
export const POOL4_TOKENS = 210000;

export const AIRDROP_CONFIG = {
  data: [
    {
      airdrop_completed_by: AIRDROP_DEADLINE,
      coins: POOL3_TOKENS,
      kyc_completed_by: KYC_DEADLINE,
      name: 'pool_three',
      pool_name: 'Code Contributions Pool',
    },
    {
      airdrop_completed_by: AIRDROP_DEADLINE,
      coins: POOL1_TOKENS,
      kyc_completed_by: KYC_DEADLINE,
      name: 'pool_one',
      pool_name: 'Phase 1 Pool',
    },
    {
      airdrop_completed_by: AIRDROP_DEADLINE,
      coins: POOL2_TOKENS,
      kyc_completed_by: KYC_DEADLINE,
      name: 'pool_two',
      pool_name: 'Phase 2 Pool',
    },
    {
      airdrop_completed_by: AIRDROP_DEADLINE,
      coins: POOL4_TOKENS,
      kyc_completed_by: KYC_DEADLINE,
      name: 'pool_four',
      pool_name: 'Phase 3 Pool',
    },
  ],
};

export const AIRDROP_ORE_FEE = 10;
