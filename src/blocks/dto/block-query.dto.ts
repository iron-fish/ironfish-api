/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { stringToBoolean } from '../../common/utils/boolean';

export class BlockQueryDto {
  @ApiPropertyOptional({ description: 'Block hash' })
  @ValidateIf((o: BlockQueryDto) => o.sequence === undefined)
  @IsDefined({
    message: '"hash" or "sequence" required to query for single block',
  })
  @IsString()
  readonly hash?: string;

  @ApiPropertyOptional({ description: 'Block sequence' })
  @ValidateIf((o: BlockQueryDto) => o.hash === undefined)
  @IsDefined({
    message: '"hash" or "sequence" required to query for single block',
  })
  @Min(1)
  @IsInt()
  @Type(() => Number)
  readonly sequence?: number;

  @ApiPropertyOptional({
    description: 'Whether or not to include transactions in the response',
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => stringToBoolean(value))
  readonly with_transactions?: boolean;
}
