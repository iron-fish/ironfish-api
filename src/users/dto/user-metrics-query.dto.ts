/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, ValidateIf } from 'class-validator';
import { MetricsGranularity } from '../../common/enums/metrics-granularity';

export class UserMetricsQueryDto {
  @ApiPropertyOptional({
    description: `ISO 8601 start date for user metrics request. Required for ${MetricsGranularity.TOTAL} requests`,
  })
  @ValidateIf((o: UserMetricsQueryDto) => Boolean(o.end))
  @IsDate()
  @Type(() => Date)
  readonly start?: Date;

  @ApiPropertyOptional({
    description: `ISO 8601 end date (exclusive) for user metrics request. Required for ${MetricsGranularity.TOTAL} requests`,
  })
  @ValidateIf((o: UserMetricsQueryDto) => Boolean(o.start))
  @IsDate()
  @Type(() => Date)
  readonly end?: Date;

  @ApiProperty({
    description: `Granularity breakdown for metrics. Must be ${MetricsGranularity.LIFETIME} or ${MetricsGranularity.TOTAL}`,
    enum: MetricsGranularity,
  })
  @IsEnum(MetricsGranularity)
  readonly granularity!: MetricsGranularity;
}
