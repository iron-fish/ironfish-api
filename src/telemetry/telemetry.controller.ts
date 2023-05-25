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
import { fetchIpAddressFromRequest } from '../common/utils/request';
import { InfluxDbService } from '../influxdb/influxdb.service';
import { CreatePointOptions } from '../influxdb/interfaces/create-point-options';
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
  ['forks_count', true],
  ['chain_database_size', true],
  ['fee_rate_estimate', true],
]);

@Controller('telemetry')
export class TelemetryController {
  private readonly MINIMUM_TELEMETRY_VERSION = '1.0.0';

  constructor(private readonly influxDbService: InfluxDbService) {}

  @ApiExcludeEndpoint()
  @Post()
  write(
    @Req() request: Request,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { points }: WriteTelemetryPointsDto,
  ): void {
    const { options, nodeVersion, agent } = this.processPoints(points);
    const ipAddress = fetchIpAddressFromRequest(request);

    if (options.length) {
      this.influxDbService.writePoints(options);
    }

    this.submitIpWithoutNodeFieldsToTelemetry(nodeVersion, agent, ipAddress);
  }

  private processPoints(points: WriteTelemetryPointDto[]): {
    nodeVersion: string | null;
    agent: string | null;
    options: CreatePointOptions[];
  } {
    const options = [];
    let nodeVersion: string | null = null;
    let agent: string | null = null;

    for (const point of points) {
      const version = point.tags.find((tag) => tag.name === 'version');
      if (!version || !this.isValidTelemetryVersion(version.value)) {
        continue;
      } else {
        nodeVersion = version.value;
      }

      const tagRuntime = point.tags.find((tag) => tag.name === 'agent');
      if (tagRuntime) {
        agent = tagRuntime.value;
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
      agent,
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
    agent: string | null,
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
            {
              name: 'agent',
              value: agent || 'unknown',
            },
          ],
          timestamp: new Date(),
        },
      ]);
    }
  }
}
