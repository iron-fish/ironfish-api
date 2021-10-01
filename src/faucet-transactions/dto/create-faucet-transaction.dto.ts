/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFaucetTransactionDto {
  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsNotEmpty()
  @IsString()
  readonly public_key!: string;
}
