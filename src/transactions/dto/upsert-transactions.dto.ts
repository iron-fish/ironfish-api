/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsJSON,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TransactionDto {
  @IsString()
  readonly hash!: string;

  @IsInt()
  @Type(() => Number)
  readonly fee!: number;

  @IsInt()
  @Type(() => Number)
  readonly size!: number;

  @IsDate()
  @Type(() => Date)
  readonly timestamp!: Date;

  @IsInt()
  @Type(() => Number)
  readonly block_id!: number;

  @IsJSON()
  readonly notes!: string;

  @IsJSON()
  readonly spends!: string;
}

export class UpsertTransactionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  readonly transactions!: TransactionDto[];
}
