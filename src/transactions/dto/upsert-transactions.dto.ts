/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';
import { BurnDto } from './burn.dto';
import { MintDto } from './mint.dto';
import { NoteDto } from './note.dto';
import { SpendDto } from './spend.dto';

export class TransactionDto {
  @IsString()
  readonly hash!: string;

  @Max(Number.MAX_SAFE_INTEGER)
  @IsInt()
  @Type(() => Number)
  readonly fee!: number;

  @Max(Number.MAX_SAFE_INTEGER)
  @IsInt()
  @Type(() => Number)
  readonly size!: number;

  @IsArray()
  @ValidateNested({ each: true })
  readonly notes!: NoteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  readonly spends!: SpendDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  readonly mints?: MintDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  readonly burns?: BurnDto[];
}

export class UpsertTransactionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  readonly transactions!: TransactionDto[];
}
