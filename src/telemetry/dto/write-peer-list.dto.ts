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
  MaxLength,
} from 'class-validator';

export class WritePeerListDto {
  @IsArray()
  @ArrayMaxSize(10000)
  @MaxLength(100, {
    each: true,
  })
  readonly peers!: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nodeId!: string;

  @IsDate()
  @Type(() => Date)
  readonly timestamp!: Date;
}
