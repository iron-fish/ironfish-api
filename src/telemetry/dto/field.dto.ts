/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export abstract class BaseFieldDto {
  @IsIn(['boolean', 'float', 'integer', 'string'])
  readonly type!: 'boolean' | 'float' | 'integer' | 'string';

  @IsNotEmpty()
  @IsString()
  readonly name!: string;
}

export class BooleanFieldDto extends BaseFieldDto {
  @Equals('boolean')
  readonly type!: 'boolean';

  @IsBoolean()
  @Type(() => Boolean)
  readonly value!: boolean;
}

export class FloatFieldDto extends BaseFieldDto {
  @Equals('float')
  readonly type!: 'float';

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  readonly value!: number;
}

export class IntegerFieldDto extends BaseFieldDto {
  @Equals('integer')
  readonly type!: 'integer';

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly value!: number;
}

export class StringFieldDto extends BaseFieldDto {
  @Equals('string')
  readonly type!: 'string';

  @IsNotEmpty()
  @IsString()
  readonly value!: string;
}

export type FieldDto =
  | BooleanFieldDto
  | FloatFieldDto
  | IntegerFieldDto
  | StringFieldDto;
