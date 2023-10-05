/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { UpdateGraffitiDto } from './update-graffiti.dto';

export class BatchUpdateGraffitiDto {
  @IsArray()
  @ApiProperty({ description: 'hash + graffiti array' })
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => UpdateGraffitiDto)
  readonly updates!: UpdateGraffitiDto[];
}
