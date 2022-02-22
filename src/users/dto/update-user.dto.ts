/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  IsISO31661Alpha3,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsISO31661Alpha3()
  readonly country_code?: string;

  @IsOptional()
  @IsString()
  readonly discord?: string;

  @IsOptional()
  @IsString()
  readonly github?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  readonly graffiti?: string;

  @IsOptional()
  @IsString()
  readonly telegram?: string;
}
