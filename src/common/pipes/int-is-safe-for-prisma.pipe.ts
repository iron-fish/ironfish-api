/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertValueIsSafeForPrisma } from '../utils/prisma';

@Injectable()
export class IntIsSafeForPrismaPipe implements PipeTransform<string> {
  transform(value: string): number {
    const isNumeric =
      ['string', 'number'].includes(typeof value) &&
      /^-?\d+$/.test(value) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      isFinite(value as any);
    if (!isNumeric) {
      throw new UnprocessableEntityException(
        'Validation failed (numeric string is expected)',
      );
    }
    const parsed = parseInt(value, 10);
    assertValueIsSafeForPrisma(parsed);
    return parsed;
  }
}
