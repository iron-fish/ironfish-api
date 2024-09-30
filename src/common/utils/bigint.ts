/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { UnprocessableEntityException } from '@nestjs/common';

export function divide(a: bigint, b: bigint): number {
  const div = a / b;
  return Number(div) + Number(a - div * b) / Number(b);
}

export function stringToPositiveBigint(key: string, value: unknown): bigint {
  try {
    if (typeof value !== 'string') {
      throw new Error();
    }
    const b = BigInt(value);
    if (b.toString() !== value) {
      throw new Error();
    }
    if (b < 0) {
      throw new Error();
    }
    return b;
  } catch {
    throw new UnprocessableEntityException(
      `${key} must have a positive integer value`,
    );
  }
}
