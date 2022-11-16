/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { EventType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';
import { BlockOperation } from '../../blocks/enums/block-operation';
export class MaspTransactionDto {
  @IsString()
  readonly hash!: string;

  @IsString()
  readonly type!: EventType;

  @IsString()
  readonly assetName!: string;
}

export class UpsertMaspTransactionBlockDto {
  @IsString()
  readonly hash!: string;

  @IsString()
  readonly previousBlockHash!: string;

  @IsDate()
  @Type(() => Date)
  readonly timestamp!: Date;

  @Max(Number.MAX_SAFE_INTEGER)
  @IsInt()
  @Type(() => Number)
  readonly sequence!: number;
}

export class UpsertMaspTransactionsOperationDto {
  @IsEnum(BlockOperation)
  readonly type!: BlockOperation;

  @Type(() => UpsertMaspTransactionBlockDto)
  readonly block!: UpsertMaspTransactionBlockDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaspTransactionDto)
  readonly transactions!: MaspTransactionDto[];
}

export class UpsertMaspTransactionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertMaspTransactionsOperationDto)
  readonly operations!: UpsertMaspTransactionsOperationDto[];
}
