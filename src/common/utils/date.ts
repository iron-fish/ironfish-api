/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function getMondayFromDate(date: Date = new Date()): Date {
  // Days are 0-based, so Monday is 1. On Tuesday (2) we
  // want the offset to be 1, and Sunday we want the offset to be 6.
  const dayOffset = (date.getUTCDay() + 6) % 7;
  const monday = new Date(
    new Date(date).setUTCDate(date.getUTCDate() - dayOffset),
  );
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function getNextDate(date: Date): Date {
  return new Date(new Date(date).setDate(date.getDate() + 1));
}
