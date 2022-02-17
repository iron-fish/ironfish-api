/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { gte, valid } from 'semver';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { WriteTelemetryPointsDto } from './dto/write-telemetry-points.dto';

@Controller('telemetry')
export class TelemetryController {
  private readonly MINIMUM_TELEMETRY_VERSION = '0.1.23';

  constructor(private readonly influxDbService: InfluxDbService) {}

  @ApiExcludeEndpoint()
  @Post()
  write(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { points }: WriteTelemetryPointsDto,
  ): void {
    const options = [];
    for (const { fields, measurement, tags, timestamp } of points) {
      const version = tags.find((tag) => tag.name === 'version');
      if (!version || !this.isValidTelemetryVersion(version.value)) {
        continue;
      }

      options.push({
        fields,
        measurement,
        tags,
        timestamp,
      });
    }

    if (options.length) {
      this.influxDbService.writePoints(options);
    }
  }

  private isValidTelemetryVersion(version: string): boolean {
    const parsed = valid(version);
    if (!parsed) {
      return false;
    }
    return gte(parsed, this.MINIMUM_TELEMETRY_VERSION);
  }
}
