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
import { InfluxDbService } from '../influxdb/influxdb.service';
import { WriteTelemetryPointDto } from './dto/write-telemetry-point.dto';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly influxDbService: InfluxDbService) {}

  @Post()
  write(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { measurement, name, tags, value }: WriteTelemetryPointDto,
  ): void {
    this.influxDbService.writePoint({
      measurement,
      name,
      tags,
      value,
      timestamp: new Date(),
    });
  }
}
