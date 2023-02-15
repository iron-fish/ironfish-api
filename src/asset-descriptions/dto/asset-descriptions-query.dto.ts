/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';
import { PaginationArgsDto } from '../../common/dto/pagination-args.dto';

export class AssetDescriptionsQueryDto extends PaginationArgsDto {
  @ApiProperty({ description: 'Asset Identifier' })
  @IsDefined({
    message: '"asset" required to query for asset descriptions',
  })
  @IsString()
  readonly asset!: string;
}
