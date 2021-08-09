/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class BlocksQueryDto extends PaginationArgsDto {
  @Min(1)
  @IsInt()
  @Type(() => Number)
  readonly sequence_gte!: number;

  @Min(1)
  @IsInt()
  @Type(() => Number)
  readonly sequence_lt!: number;
}
