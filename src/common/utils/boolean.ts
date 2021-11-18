/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { UnprocessableEntityException } from '@nestjs/common';

export function isBoolString(value: unknown): boolean {
  return typeof value === 'string' && (value === 'true' || value === 'false');
}

export function stringToBoolean(value: unknown): boolean {
  if (!isBoolString(value)) {
    throw new UnprocessableEntityException(
      `Boolean string parameter must have value of either 'true' or 'false'`,
    );
  }
  return value === 'true';
}
