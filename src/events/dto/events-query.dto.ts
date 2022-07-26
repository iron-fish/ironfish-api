/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class EventsQueryDto {
  @ApiPropertyOptional({ description: 'Unique User identifier' })
  @IsInt()
  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER)
  @Type(() => Number)
  readonly user_id?: number;

  @ApiPropertyOptional({
    description:
      'An object identifier to use as a cursor pagination to fetch records after',
  })
  @IsISO8601()
  @IsOptional()
  @Type(() => String)
  readonly after?: string;

  @ApiPropertyOptional({
    description:
      'An object identifier to use as a cursor pagination to fetch records before',
  })
  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  @Type(() => String)
  readonly before?: string;

  @ApiPropertyOptional({
    description: 'A limit on the number of objects to return between 1 and 100',
  })
  @Max(100)
  @Min(1)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly limit?: number;
}
