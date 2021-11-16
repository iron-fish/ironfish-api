/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function getMondayFromDate(date: Date = new Date()): Date {
  const monday = new Date(
    new Date(date).setUTCDate(date.getUTCDate() - date.getUTCDay()),
  );
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function getNextDate(date: Date): Date {
  return new Date(new Date(date).setDate(date.getDate() + 1));
}
