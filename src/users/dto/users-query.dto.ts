/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsEnum,
  IsISO31661Alpha3,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';
import { EventType } from '.prisma/client';

export class UsersQueryDto extends PaginationArgsDto {
  @ApiPropertyOptional({
    description: `Property to order results by. Defaults to 'rank'`,
  })
  @IsOptional()
  @Equals('rank')
  readonly order_by?: 'rank';

  @ApiPropertyOptional({
    description: 'ISO 3166-1 Alpha-3 country code filter',
  })
  @IsOptional()
  @IsISO31661Alpha3()
  readonly country_code?: string;

  @ApiPropertyOptional({ description: 'Keyword search filter' })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiPropertyOptional({ description: 'Event type filter', enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  readonly event_type?: EventType;
}
