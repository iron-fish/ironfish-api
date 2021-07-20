/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { EventType } from '.prisma/client';

export class CreateEventDto {
  @IsInt()
  @Type(() => Number)
  readonly account_id!: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly points!: number;

  @IsEnum(EventType)
  readonly type!: EventType;
}
