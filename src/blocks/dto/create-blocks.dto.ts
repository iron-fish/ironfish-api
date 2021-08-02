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
  IsString,
  ValidateNested,
} from 'class-validator';
import { BlockOperation } from '../enums/block-operation';

class BlockDto {
  @IsString()
  readonly hash!: string;

  @IsInt()
  @Type(() => Number)
  readonly sequence!: number;

  @IsString()
  readonly difficulty!: string;

  @IsEnum(BlockOperation)
  readonly type!: BlockOperation;

  @IsDate()
  @Type(() => Date)
  readonly timestamp!: Date;

  @IsInt()
  @Type(() => Number)
  readonly transactions_count!: number;

  @IsString()
  readonly graffiti!: string;

  @IsOptional()
  @IsString()
  readonly previous_block_hash?: string;
}

export class CreateBlocksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  readonly blocks!: BlockDto[];
}
