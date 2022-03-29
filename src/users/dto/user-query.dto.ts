/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { stringToBoolean } from '../../common/utils/boolean';

export class UserQueryDto {
  @ApiProperty({ description: 'User graffiti' })
  @IsString()
  readonly graffiti!: string;

  @ApiPropertyOptional({
    description: 'Whether or not to include user rank in the response',
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => stringToBoolean(value))
  readonly with_rank?: boolean;
}
