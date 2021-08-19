/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class BlockQueryDto { 
  @IsString()
  readonly hash!: string;

  @Min(1)
  @IsInt()
  @Type(() => Number)
  readonly sequence!: number;
}