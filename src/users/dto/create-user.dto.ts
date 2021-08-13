/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  IsDefined,
  IsISO31661Alpha3,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsISO31661Alpha3()
  readonly country_code!: string;

  @IsString()
  readonly email!: string;

  @IsString()
  readonly graffiti!: string;

  @ValidateIf((o: CreateUserDto) => o.telegram === undefined)
  @IsDefined({
    message: '"discord" or "telegram" required when registering',
  })
  readonly discord?: string;

  @ValidateIf((o: CreateUserDto) => o.discord === undefined)
  @IsDefined({
    message: '"discord" or "telegram" required when registering',
  })
  readonly telegram?: string;
}
