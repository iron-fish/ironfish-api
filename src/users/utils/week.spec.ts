/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { phase3Week } from './week';

describe('Week Utils', () => {
  it('phase3Week()', () => {
    const getWeek = (
      yearUTC: number,
      monthUTC: number,
      dayUTC: number,
    ): { day: number; week: number } => {
      const date = new Date();
      date.setUTCFullYear(yearUTC, monthUTC, dayUTC);

      return {
        day: date.getUTCDay(),
        week: phase3Week(date),
      };
    };

    // (2022, 0, 1) is Sat, 01 Jan 2022 05:00:00 GMT
    expect(getWeek(2022, 0, 1)).toEqual({ day: 6, week: 2712 });
    expect(getWeek(2022, 0, 2)).toEqual({ day: 0, week: 2712 });
    expect(getWeek(2022, 0, 3)).toEqual({ day: 1, week: 2713 });
    expect(getWeek(2022, 0, 4)).toEqual({ day: 2, week: 2713 });
    expect(getWeek(2022, 0, 5)).toEqual({ day: 3, week: 2713 });
    expect(getWeek(2022, 0, 6)).toEqual({ day: 4, week: 2713 });
    expect(getWeek(2022, 0, 7)).toEqual({ day: 5, week: 2713 });
  });
});
