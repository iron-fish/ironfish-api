/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';
import { TransactionDto } from '../../transactions/dto/upsert-transactions.dto';
import { BlockOperation } from '../enums/block-operation';

export class BlockDto {
  @IsString()
  readonly hash!: string;

  @Max(Number.MAX_SAFE_INTEGER)
  @IsInt()
  @Type(() => Number)
  readonly sequence!: number;

  @IsInt()
  @Type(() => Number)
  readonly difficulty!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly work?: number;

  @IsEnum(BlockOperation)
  readonly type!: BlockOperation;

  @IsDate()
  @Type(() => Date)
  readonly timestamp!: Date;

  @IsString()
  readonly graffiti!: string;

  @IsOptional()
  @IsString()
  readonly previous_block_hash?: string;

  @Max(Number.MAX_SAFE_INTEGER)
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly size!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  readonly transactions!: TransactionDto[];
}

export class UpsertBlocksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  readonly blocks!: BlockDto[];
}
