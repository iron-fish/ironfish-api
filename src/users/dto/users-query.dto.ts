/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Equals,
  IsAlphanumeric,
  IsEnum,
  IsISO31661Alpha3,
  IsOptional,
} from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';
import { EventType } from '.prisma/client';

export class UsersQueryDto extends PaginationArgsDto {
  @IsOptional()
  @Equals('rank')
  readonly order_by?: 'rank';

  @IsOptional()
  @IsISO31661Alpha3()
  readonly country_code?: string;

  @IsOptional()
  @IsAlphanumeric()
  readonly search?: string;

  @IsOptional()
  @IsEnum(EventType)
  readonly event_type?: EventType;
}
