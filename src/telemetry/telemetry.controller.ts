/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { gte, valid } from 'semver';
import { ApiConfigService } from '../api-config/api-config.service';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { NodeUptimesService } from '../node-uptimes/node-uptimes.service';
import { UsersService } from '../users/users.service';
import { VersionsService } from '../versions/versions.service';
import { WriteTelemetryPointsDto } from './dto/write-telemetry-points.dto';

@Controller('telemetry')
export class TelemetryController {
  private readonly MINIMUM_TELEMETRY_VERSION = '0.1.24';

  constructor(
    private readonly config: ApiConfigService,
    private readonly influxDbService: InfluxDbService,
    private readonly nodeUptimes: NodeUptimesService,
    private readonly usersService: UsersService,
    private readonly versionsService: VersionsService,
  ) {}

  @ApiExcludeEndpoint()
  @Post()
  async write(
    @Req() request: Request,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { points, graffiti }: WriteTelemetryPointsDto,
  ): Promise<void> {
    const options = [];
    let nodeVersion;
    for (const { fields, measurement, tags, timestamp } of points) {
      const version = tags.find((tag) => tag.name === 'version');
      if (!version || !this.isValidTelemetryVersion(version.value)) {
        continue;
      }
      nodeVersion = version.value;

      if (this.getSkippedMeasurements().includes(measurement)) {
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

    this.submitIpWithoutNodeFieldsToTelemetry(request);

    if (!graffiti || !nodeVersion) {
      return;
    }

    const nodeUptimeEnabled = this.config.get<boolean>('NODE_UPTIME_ENABLED');
    if (!nodeUptimeEnabled) {
      return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const minVersion = await this.versionsService.getLatestAtDate(oneWeekAgo);

    // If the API fails to fetch a version, we don't want to punish the user
    if (!minVersion || gte(nodeVersion, minVersion.version)) {
      const user = await this.usersService.findByGraffiti(graffiti);

      if (user) {
        await this.nodeUptimes.addUptime(user);
      }
    }
  }

  private getSkippedMeasurements(): string[] {
    const measurements = this.config.getWithDefault<string>(
      'SKIP_MEASUREMENTS',
      '',
    );
    return measurements ? measurements.split(',') : [];
  }

  private isValidTelemetryVersion(version: string): boolean {
    const parsed = valid(version);
    if (!parsed) {
      return false;
    }
    return gte(parsed, this.MINIMUM_TELEMETRY_VERSION);
  }

  private submitIpWithoutNodeFieldsToTelemetry(request: Request): void {
    const xForwardedFor = request.header('X-Forwarded-For');
    if (xForwardedFor) {
      const addresses = xForwardedFor.split(',');
      if (addresses.length) {
        const ip = addresses[0].trim();
        this.influxDbService.writePoints([
          {
            measurement: 'node_addresses',
            fields: [
              {
                name: 'ip',
                type: 'string',
                value: ip,
              },
            ],
            tags: [],
            timestamp: new Date(),
          },
        ]);
      }
    }
  }
}
