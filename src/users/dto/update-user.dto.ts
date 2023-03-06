/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  readonly discord?: string;

  @IsOptional()
  @IsString()
  readonly github?: string;

  @IsOptional()
  @IsString()
  readonly telegram?: string;
}
