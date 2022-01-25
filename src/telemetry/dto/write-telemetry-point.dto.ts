/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class TagDto {
  @IsNotEmpty()
  @IsString()
  readonly name!: string;

  @IsNotEmpty()
  @IsString()
  readonly value!: string;
}

export class WriteTelemetryPointDto {
  @IsNotEmpty()
  @IsString()
  readonly measurement!: string;

  @IsNotEmpty()
  @IsString()
  readonly name!: string;

  @IsArray()
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  readonly tags!: TagDto[];

  @IsPositive()
  @IsNumber()
  @Type(() => Number)
  readonly value!: number;
}
