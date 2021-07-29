/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Equals, IsOptional } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class UsersQueryDto extends PaginationArgsDto {
  @IsOptional()
  @Equals('total_points')
  readonly order_by?: 'total_points';
}
