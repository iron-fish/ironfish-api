/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class AssetQueryDto {
  @ApiProperty({ description: 'Asset Identifier' })
  @IsDefined({
    message: '"id" required to query for asset',
  })
  @IsString()
  readonly id!: string;
}
