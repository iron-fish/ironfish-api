/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  POINTS_PER_CATEGORY,
  WEEKLY_POINT_LIMITS_BY_EVENT_TYPE,
} from '../common/constants';
import { EventType } from '.prisma/client';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  @ApiOperation({ summary: 'Gets the global config of event metrics' })
  @Get('config')
  config(): {
    points_per_category: Record<EventType, number>;
    weekly_limits: Record<EventType, number>;
  } {
    return {
      points_per_category: POINTS_PER_CATEGORY,
      weekly_limits: WEEKLY_POINT_LIMITS_BY_EVENT_TYPE,
    };
  }
}
