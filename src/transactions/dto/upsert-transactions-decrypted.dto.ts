/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';

export class NoteDecryptedDto {
  @IsInt()
  @Type(() => Number)
  readonly amount!: number;

  @IsString()
  readonly memo!: string;
}

export class TransactionDecryptedDto {
  @IsString()
  readonly hash!: string;

  @IsArray()
  @ValidateNested({ each: true })
  readonly notes!: NoteDecryptedDto[];
}

export class UpsertTransactionsDecryptedDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => TransactionDecryptedDto)
  readonly transactions!: TransactionDecryptedDto[];
}
