/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export enum GraphileWorkerPattern {
  DELETE_BLOCK_MINED_EVENT = 'DELETE_BLOCK_MINED_EVENT',
  CREATE_NODE_UPTIME_EVENT = 'CREATE_NODE_UPTIME_EVENT',
  REFRESH_USERS_POINTS = 'REFRESH_USERS_POINTS',
  REFRESH_USER_POINTS = 'REFRESH_USER_POINTS',
  SYNC_BLOCKS_DAILY = 'SYNC_BLOCKS_DAILY',
  UPDATE_LATEST_POINTS = 'UPDATE_LATEST_POINTS',
  UPSERT_BLOCK_MINED_EVENT = 'UPSERT_BLOCK_MINED_EVENT',
}
