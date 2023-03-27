/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export const POOL1 = 'pool_one';
export const POOL2 = 'pool_two';
export const POOL3 = 'pool_three';
export const POOL4 = 'pool_four';

export const POOLS = [POOL1, POOL2, POOL3, POOL4] as const;
export type Pool = (typeof POOLS)[number];
