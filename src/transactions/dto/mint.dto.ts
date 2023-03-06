/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { IsString } from 'class-validator';

export class MintDto {
  @IsString()
  readonly id!: string;

  @IsString()
  readonly metadata!: string;

  @IsString()
  readonly name!: string;

  @IsString()
  readonly owner!: string;

  @IsString()
  readonly value!: string;
}
