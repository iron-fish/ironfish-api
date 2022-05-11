/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationArgsDto {
  @ApiPropertyOptional({
    description:
      'An object identifier to use as a cursor pagination to fetch records after',
  })
  @Max(Number.MAX_SAFE_INTEGER)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly after?: number;

  @ApiPropertyOptional({
    description:
      'An object identifier to use as a cursor pagination to fetch records before',
  })
  @Max(Number.MAX_SAFE_INTEGER)
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly before?: number;

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
