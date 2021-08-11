/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { IsISO31661Alpha3, IsString } from 'class-validator';

export class CreateUserDto {
  @IsISO31661Alpha3()
  readonly country_code!: string;

  @IsString()
  readonly email!: string;

  @IsString()
  readonly graffiti!: string;
}
