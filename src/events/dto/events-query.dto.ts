/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

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
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  readonly after?: Date;

  @ApiPropertyOptional({
    description:
      'An object identifier to use as a cursor pagination to fetch records before',
  })
  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  readonly before?: Date;

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
