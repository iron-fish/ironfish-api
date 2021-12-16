/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class NextFaucetTransactionsDto {
  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly num?: number;
}
