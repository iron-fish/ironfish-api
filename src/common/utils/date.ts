/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function getMondayOfThisWeek(): Date {
  const now = new Date();
  const monday = new Date(now.setUTCDate(now.getUTCDate() - now.getUTCDay()));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}
