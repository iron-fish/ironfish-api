/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class BlocksQueryDto extends PaginationArgsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly transaction_id?: number;

  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly sequence_gte?: number;

  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly sequence_lt?: number;

  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  readonly with_transactions?: boolean;
}
