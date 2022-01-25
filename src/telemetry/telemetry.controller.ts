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
import { InfluxDbService } from '../influxdb/influxdb.service';
import { WriteTelemetryPointsDto } from './dto/write-telemetry-point.dto';

@Controller('telemetry')
export class TelemetryController {
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
    for (const { measurement, name, tags, value } of points) {
      options.push({
        measurement,
        name,
        tags,
        value,
        timestamp: new Date(),
      });
    }

    this.influxDbService.writePoints(options);
  }
}
