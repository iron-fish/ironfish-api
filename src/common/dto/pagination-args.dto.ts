/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationArgsDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly after?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly before?: number;

  @Max(100)
  @Min(1)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  readonly limit?: number;
}
