/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  IsDefined,
  IsISO31661Alpha3,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';

const UPDATE_USER_VALIDATION_MESSAGE =
  '"discord", "graffiti", "telegram", or "country_code" required when updating';

export class UpdateUserDto {
  @ValidateIf(
    (o: UpdateUserDto) =>
      o.discord === undefined &&
      o.graffiti === undefined &&
      o.telegram === undefined,
  )
  @IsDefined({
    message: UPDATE_USER_VALIDATION_MESSAGE,
  })
  @IsISO31661Alpha3()
  readonly country_code?: string;

  @ValidateIf(
    (o: UpdateUserDto) =>
      o.country_code === undefined &&
      o.graffiti === undefined &&
      o.telegram === undefined,
  )
  @IsDefined({
    message: UPDATE_USER_VALIDATION_MESSAGE,
  })
  @IsString()
  readonly discord?: string;

  @ValidateIf(
    (o: UpdateUserDto) =>
      o.country_code === undefined &&
      o.discord === undefined &&
      o.telegram === undefined,
  )
  @IsDefined({
    message: UPDATE_USER_VALIDATION_MESSAGE,
  })
  @IsNotEmpty()
  @IsString()
  readonly graffiti?: string;

  @ValidateIf(
    (o: UpdateUserDto) =>
      o.country_code === undefined &&
      o.discord === undefined &&
      o.graffiti === undefined,
  )
  @IsDefined({
    message: UPDATE_USER_VALIDATION_MESSAGE,
  })
  @IsString()
  readonly telegram?: string;
}
