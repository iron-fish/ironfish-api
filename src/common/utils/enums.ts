/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export type StrEnumValue<T> = T[keyof T];
export type StrEnum<T> = Record<keyof T, string>;

function getEnumStrValues<T extends StrEnum<T>>(
  enumType: T,
): Array<StrEnumValue<T>> {
  return Object.values(enumType)
    .filter((v) => typeof v === 'string')
    .map((v) => v as StrEnumValue<T>);
}

export function isInStrEnum<T extends StrEnum<T>>(
  value: unknown,
  enumType: T,
): boolean {
  return !!getEnumStrValues(enumType).find((enumValue) => enumValue === value);
}
