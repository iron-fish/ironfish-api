/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateGraffitiDto {
  @ApiProperty({ description: 'Block hash' })
  @IsDefined({
    message: '"hash" of the block',
  })
  @IsString()
  readonly hash!: string;

  @ApiProperty({ description: 'Block graffiti' })
  @IsDefined({
    message: '"graffiti" of the block',
  })
  @MinLength(64, {
    message: 'must be exactly 64 characters in length',
  })
  @MaxLength(64, {
    message: 'must be exactly 64 characters in length',
  })
  @Matches(/^[0-9A-Fa-f]+$/, {
    message: 'must be 64 length hex string',
  })
  readonly graffiti!: string;
}
