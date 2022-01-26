/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  BaseFieldDto,
  BooleanFieldDto,
  FieldDto,
  FloatFieldDto,
  IntegerFieldDto,
  StringFieldDto,
} from './field.dto';

class TagDto {
  @IsNotEmpty()
  @IsString()
  readonly name!: string;

  @IsNotEmpty()
  @IsString()
  readonly value!: string;
}

class WriteTelemetryPointDto {
  @IsArray()
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => BaseFieldDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'boolean', value: BooleanFieldDto },
        { name: 'float', value: FloatFieldDto },
        { name: 'integer', value: IntegerFieldDto },
        { name: 'string', value: StringFieldDto },
      ],
    },
  })
  readonly fields!: FieldDto[];

  @IsNotEmpty()
  @IsString()
  readonly measurement!: string;

  @IsDate()
  @Type(() => Date)
  readonly timestamp!: Date;

  @IsArray()
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  readonly tags!: TagDto[];
}

export class WriteTelemetryPointsDto {
  @IsArray()
  @ArrayMaxSize(3000)
  @ValidateNested({ each: true })
  @Type(() => WriteTelemetryPointDto)
  readonly points!: WriteTelemetryPointDto[];
}
