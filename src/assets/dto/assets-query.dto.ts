/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';
import { stringToBoolean } from '../../common/utils/boolean';

export class AssetsQueryDto extends PaginationArgsDto {
  @ApiPropertyOptional({ description: 'Keyword search filter' })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiProperty({ description: 'Return only verified or unverified assets' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: TransformFnParams) => stringToBoolean(value))
  readonly verified?: boolean;
}
