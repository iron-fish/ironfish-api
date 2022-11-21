/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function phase3Week(compareDate: Date): number {
  const launch = new Date(2023, 0, 18);
  const dayOfYear =
    (compareDate.getTime() - launch.getTime() + 86400000) / 86400000;
  return Math.ceil(dayOfYear / 7);
}
