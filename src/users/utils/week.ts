/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export function phase3Week(blockTimestamp: Date): number {
  const sundayAlignEpoch = 2.592e8;
  return Math.floor(
    (blockTimestamp.getTime() - sundayAlignEpoch) / 1000 / 60 / 60 / 24 / 7,
  );
}
