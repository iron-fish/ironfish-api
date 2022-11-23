/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { phase3Week } from './week';

describe('Week Utils', () => {
  it('phase3Week()', () => {
    const date = new Date();

    const getWeek = (dayOfMonthUTC: number): { day: number; week: number } => {
      date.setUTCFullYear(2022, 0, dayOfMonthUTC);
      return { day: date.getUTCDay(), week: phase3Week(date) };
    };

    expect(getWeek(1)).toEqual({ day: 6, week: 162769 });
    expect(getWeek(2)).toEqual({ day: 0, week: 162770 });
    expect(getWeek(3)).toEqual({ day: 1, week: 162770 });
    expect(getWeek(4)).toEqual({ day: 2, week: 162770 });
    expect(getWeek(5)).toEqual({ day: 3, week: 162770 });
    expect(getWeek(6)).toEqual({ day: 4, week: 162770 });
    expect(getWeek(7)).toEqual({ day: 5, week: 162770 });
  });
});
