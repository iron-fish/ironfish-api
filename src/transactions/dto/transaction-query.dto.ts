/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TransactionQueryDto {
  @IsString()
  readonly hash!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  readonly with_blocks?: boolean;
}
