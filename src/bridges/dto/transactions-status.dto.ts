/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class TransactionsStatusDto {
  @ApiProperty({ description: 'Hash of the source transaction' })
  @IsString()
  @IsDefined({
    message: 'Transaction hash required to check transaction status',
  })
  readonly hash!: string;

  @ApiPropertyOptional({
    description: 'Network ID of the source transaction',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly network_id: number = 22;
}
