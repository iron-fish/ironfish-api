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
import { NODE_UPTIME_CREDIT_HOURS } from '../common/constants';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { NodeUptimesService } from '../node-uptimes/node-uptimes.service';
import { UsersService } from '../users/users.service';
import { WriteTelemetryPointsDto } from './dto/write-telemetry-points.dto';

@Controller('telemetry')
export class TelemetryController {
  private readonly MINIMUM_TELEMETRY_VERSION = '0.1.24';

  constructor(
    private readonly config: ApiConfigService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly influxDbService: InfluxDbService,
    private readonly nodeUptimes: NodeUptimesService,
    private readonly usersService: UsersService,
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

    this.submitIpWithoutNodeFieldsToTelemetry(request);

    if (!this.config.isProduction() && graffiti) {
      const user = await this.usersService.findByGraffiti(graffiti);
      if (user) {
        const uptime = await this.nodeUptimes.upsert(user);
        if (uptime && uptime.total_hours >= NODE_UPTIME_CREDIT_HOURS) {
          await this.graphileWorkerService.addJob(
            GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT,
            { userId: user.id },
          );
        }
      }
    }
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
