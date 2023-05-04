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
import semver from 'semver';
import { ApiConfigService } from '../api-config/api-config.service';
import { PHASE_3_END } from '../common/constants';
import { fetchIpAddressFromRequest } from '../common/utils/request';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { CreatePointOptions } from '../influxdb/interfaces/create-point-options';
import { NodeUptimesService } from '../node-uptimes/node-uptimes.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { VersionsService } from '../versions/versions.service';
import {
  WriteTelemetryPointDto,
  WriteTelemetryPointsDto,
} from './dto/write-telemetry-points.dto';

/** How many blocks per sequence for block_propagation measurement to allow through telemetry */
export const BLOCK_PROPAGATION_INTERVAL = 5;

const TELEMETRY_WHITELIST = new Map<string, true | Array<string>>([
  ['block_mined', true],
  ['block_propagation', true],
  ['node_started', true],
  [
    'node_stats',
    [
      'create_new_block_template_duration',
      'heap_total',
      'heap_used',
      'peers_count',
      'rss',
      'session_id',
      'node_id',
      'mempool_size',
      'mempool_size_bytes',
      'mempool_max_size_bytes',
      'mempool_saturation',
      'mempool_evictions',
      'mempool_recently_evicted_cache_size',
      'mempool_recently_evicted_cache_max_size',
      'mempool_recently_evicted_cache_saturation',
      'head_sequence',
      'inbound_traffic',
      'inbound_traffic_newblock',
      'inbound_traffic_newtransaction',
      'inbound_traffic_pooledtransactionsrequest',
      'inbound_traffic_pooledtransactionsrequest',
      'inbound_traffic_newpooledtransactionhashes',
      'inbound_traffic_newtransactionv2',
      'inbound_traffic_newblockhashes',
      'inbound_traffic_newblockv2',
      'inbound_traffic_getblocktransactionsrequest',
      'inbound_traffic_getblocktransactionsresponse',
      'inbound_traffic_getcompactblockrequest',
      'inbound_traffic_getcompactblockresponse',
      'outbound_traffic',
      'outbound_traffic_newblock',
      'outbound_traffic_newtransaction',
      'outbound_traffic_pooledtransactionsrequest',
      'outbound_traffic_pooledtransactionsrequest',
      'outbound_traffic_newpooledtransactionhashes',
      'outbound_traffic_newtransactionv2',
      'outbound_traffic_newblockhashes',
      'outbound_traffic_newblockv2',
      'outbound_traffic_getblocktransactionsrequest',
      'outbound_traffic_getblocktransactionsresponse',
      'outbound_traffic_getcompactblockrequest',
      'outbound_traffic_getcompactblockresponse',
      'rpc_response_ms_getblockhashesrequest',
      'rpc_response_ms_getblocksrequest',
      'rpc_success_getblockhashesrequest',
      'rpc_success_getblocksrequest',
    ],
  ],
  ['transaction_propagation', true],
  ['block_assembled', true],
  ['forks_count', true],
  ['fee_rate_estimate', true],
]);

@Controller('telemetry')
export class TelemetryController {
  private readonly MINIMUM_TELEMETRY_VERSION = '1.0.0';

  constructor(
    private readonly config: ApiConfigService,
    private readonly influxDbService: InfluxDbService,
    private readonly nodeUptimes: NodeUptimesService,
    private readonly usersService: UsersService,
    private readonly versionsService: VersionsService,
    private readonly prismaService: PrismaService,
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
    const { options, nodeVersion } = this.processPoints(points);
    const ipAddress = fetchIpAddressFromRequest(request);

    // Only process points before the end of phase 3
    const skipUptime =
      this.config.get<boolean>('ENABLE_PHASE_3_END_CHECK') &&
      new Date() >= PHASE_3_END;

    if (graffiti && nodeVersion && !skipUptime) {
      await this.addUptime(graffiti, nodeVersion, ipAddress);
    }

    if (options.length) {
      this.influxDbService.writePoints(options);
    }

    this.submitIpWithoutNodeFieldsToTelemetry(nodeVersion, ipAddress);
  }

  async addUptime(
    graffiti: string,
    nodeVersion: string,
    ipAddress: string,
  ): Promise<void> {
    const nodeUptimeEnabled = this.config.get<boolean>(
      'ALLOW_NODE_UPTIME_POINTS',
    );

    if (!nodeUptimeEnabled) {
      return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const minVersion = await this.versionsService.getLatestAtDate(
      oneWeekAgo,
      this.prismaService.readClient,
    );

    // If the API fails to fetch a version, we don't want to punish the user
    if (minVersion && semver.lt(nodeVersion, minVersion.version)) {
      return;
    }

    const user = await this.usersService.findByGraffiti(
      graffiti,
      this.prismaService.readClient,
    );
    if (!user) {
      return;
    }

    await this.nodeUptimes.addUptime(user);

    await this.usersService.updateHashedIpAddress(user, ipAddress);
  }

  private processPoints(points: WriteTelemetryPointDto[]): {
    nodeVersion: string | null;
    options: CreatePointOptions[];
  } {
    const options = [];
    let nodeVersion: string | null = null;

    for (const point of points) {
      const version = point.tags.find((tag) => tag.name === 'version');
      if (!version || !this.isValidTelemetryVersion(version.value)) {
        continue;
      } else {
        nodeVersion = version.value;
      }

      const filters = TELEMETRY_WHITELIST.get(point.measurement);
      if (filters === undefined) {
        continue;
      }

      if (point.measurement === 'block_propagation') {
        const sequence = point.fields.find((f) => f.name === 'sequence');

        if (!sequence || sequence.type !== 'integer') {
          continue;
        }

        // We only process block_propagation every 5 blocks
        if (sequence.value % BLOCK_PROPAGATION_INTERVAL !== 0) {
          continue;
        }
      }

      const fields = point.fields.filter((field) => {
        return filters === true || filters.includes(field.name);
      });

      options.push({
        fields,
        measurement: point.measurement,
        tags: point.tags,
        timestamp: point.timestamp,
      });
    }

    return {
      nodeVersion,
      options,
    };
  }

  private isValidTelemetryVersion(version: string): boolean {
    const parsed = semver.valid(version);
    if (!parsed) {
      return false;
    }
    return semver.gte(parsed, this.MINIMUM_TELEMETRY_VERSION);
  }

  private submitIpWithoutNodeFieldsToTelemetry(
    nodeVersion: string | null,
    ipAddress: string,
  ): void {
    if (nodeVersion) {
      this.influxDbService.writePoints([
        {
          measurement: 'node_addresses',
          fields: [
            {
              name: 'ip',
              type: 'string',
              value: ipAddress,
            },
          ],
          tags: [
            {
              name: 'version',
              value: nodeVersion,
            },
          ],
          timestamp: new Date(),
        },
      ]);
    }
  }
}
