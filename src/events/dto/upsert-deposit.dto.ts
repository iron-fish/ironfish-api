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

export class DepositDto {
  @IsString()
  readonly hash!: string;

  @IsString()
  readonly transaction_hash!: string;

  @IsString()
  readonly memo!: string;

  @IsInt()
  readonly note_index!: string;

  @IsInt()
  readonly amount!: number;
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

  @IsArray()
  @Type(() => UpsertDepositBlockDto)
  @ValidateNested({ each: true })
  readonly block!: UpsertDepositBlockDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DepositDto)
  readonly deposits!: DepositDto[];
}

export class UpsertDepositsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertDepositsOperationDto)
  readonly operations!: UpsertDepositsOperationDto[];
}
