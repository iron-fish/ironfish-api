/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class AssetsQueryDto extends PaginationArgsDto {
  @ApiPropertyOptional({ description: 'Keyword search filter' })
  @IsOptional()
  @IsString()
  readonly search?: string;
}
