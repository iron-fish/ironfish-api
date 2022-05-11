/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EventType } from '.prisma/client';

export class CreateEventDto {
  @IsString()
  readonly graffiti!: string;

  @IsOptional()
  @IsInt()
  @Max(Number.MAX_SAFE_INTEGER)
  @Min(0)
  @Type(() => Number)
  readonly points?: number;

  @IsEnum(EventType)
  readonly type!: EventType;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  readonly occurred_at?: Date;

  @IsOptional()
  @IsString()
  readonly url?: string;
}
