/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class BlocksQueryDto extends PaginationArgsDto {
  @ApiPropertyOptional({ description: 'Unique Transaction identifier' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly transaction_id?: number;

  @ApiPropertyOptional({
    description: 'Greater than or equal to filter for Block sequence',
  })
  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly sequence_gte?: number;

  @ApiPropertyOptional({ description: 'Less than filter for Block sequence' })
  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly sequence_lt?: number;

  @ApiPropertyOptional({ description: 'Keyword search filter' })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiPropertyOptional({
    description: 'Whether or not to include transactions in the response',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  readonly with_transactions?: boolean;
}
