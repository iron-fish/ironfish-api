/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';
import { stringToBoolean } from '../../common/utils/boolean';

export class TransactionsQueryDto extends PaginationArgsDto {
  @Max(Number.MAX_SAFE_INTEGER)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly block_id?: number;

  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => stringToBoolean(value))
  readonly with_blocks?: boolean;
}
