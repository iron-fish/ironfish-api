/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateVerifiedAssetsDto {
  @ApiProperty({ description: 'Version of the verfied assets schema to use' })
  @IsDefined()
  @IsInt()
  readonly version!: number;

  @ApiProperty({ description: 'List of assets to update as verified' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerifiedAssetMetadataDto)
  readonly assets!: VerifiedAssetMetadataDto[];
}

export class VerifiedAssetMetadataDto {
  @IsString()
  @IsDefined({
    message: 'Cannot update verified asset without an identifier',
  })
  readonly identifier!: string;

  @IsString()
  @IsDefined()
  readonly symbol!: string;

  @IsInt()
  @IsOptional()
  readonly decimals?: number;

  @IsString()
  @IsOptional()
  readonly logoURI?: string;

  @IsString()
  @IsOptional()
  readonly website?: string;
}
