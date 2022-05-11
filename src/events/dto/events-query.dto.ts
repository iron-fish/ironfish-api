/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class EventsQueryDto extends PaginationArgsDto {
  @ApiPropertyOptional({ description: 'Unique User identifier' })
  @IsInt()
  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER)
  @Type(() => Number)
  readonly user_id?: number;
}
