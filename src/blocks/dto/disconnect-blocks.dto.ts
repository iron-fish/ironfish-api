/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class DisconnectBlocksDto {
  @Max(Number.MAX_SAFE_INTEGER)
  @Min(1)
  @IsInt()
  @Type(() => Number)
  readonly sequence_gt!: number;
}
