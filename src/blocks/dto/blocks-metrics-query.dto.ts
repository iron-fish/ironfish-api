/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum } from 'class-validator';
import { MetricsGranularity } from '../../common/enums/metrics-granularity';

export class BlocksMetricsQueryDto {
  @ApiProperty({
    description: 'Start date for snapshots',
  })
  @IsDate()
  @Type(() => Date)
  readonly start!: Date;

  @ApiProperty({
    description: 'End date for snapshots (exclusive)',
  })
  @IsDate()
  @Type(() => Date)
  readonly end!: Date;

  @ApiProperty({
    description: 'Granularity breakdown for metrics',
  })
  @IsEnum(MetricsGranularity)
  readonly granularity!: MetricsGranularity;
}
