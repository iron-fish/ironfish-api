/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TransactionQueryDto {
  @ApiProperty({ description: 'Transaction hash' })
  @IsString()
  readonly hash!: string;

  @ApiPropertyOptional({
    description: 'Whether or not to include blocks in the response',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  readonly with_blocks?: boolean;
}
