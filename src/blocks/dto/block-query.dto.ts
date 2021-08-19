/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsString, Min, ValidateIf } from 'class-validator';

export class BlockQueryDto {
  @ValidateIf((o: BlockQueryDto) => o.sequence === undefined)
  @IsDefined({
    message: '"hash" or "sequence" required to query for single block'
  })
  @IsString()
  readonly hash?: string;

  @ValidateIf((o: BlockQueryDto) => o.hash === undefined)
  @IsDefined({
    message: '"hash" or "sequence" required to query for single block'
  })
  @Min(1)
  @IsInt()
  @Type(() => Number)
  readonly sequence?: number;
}
