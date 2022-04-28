/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BlockOperation } from '../../blocks/enums/block-operation';

export class UpsertDepositsNoteDto {
  @IsString()
  readonly memo!: string;

  @IsInt()
  readonly amount!: number;
}

export class DepositTransactionDto {
  @IsString()
  readonly hash!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertDepositsNoteDto)
  readonly notes!: UpsertDepositsNoteDto[];
}

export class UpsertDepositBlockDto {
  @IsString()
  readonly hash!: string;

  @IsInt()
  @Type(() => Number)
  readonly sequence!: number;
}

export class UpsertDepositsOperationDto {
  @IsEnum(BlockOperation)
  readonly type!: BlockOperation;

  @Type(() => UpsertDepositBlockDto)
  readonly block!: UpsertDepositBlockDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DepositTransactionDto)
  readonly transactions!: DepositTransactionDto[];
}

export class UpsertDepositsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertDepositsOperationDto)
  readonly operations!: UpsertDepositsOperationDto[];
}
