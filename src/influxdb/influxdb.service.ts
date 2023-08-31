/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ApiConfigService } from '../api-config/api-config.service';
import { CreatePointOptions } from './interfaces/create-point-options';

@Injectable()
export class InfluxDbService implements OnModuleDestroy {
  private writeClient: WriteApi;
  private networkId = '2';

  constructor(private readonly config: ApiConfigService) {
    const client = new InfluxDB({
      token: config.get<string>('INFLUXDB_API_TOKEN'),
      url: config.get<string>('INFLUXDB_URL'),
    });
    this.writeClient = client.getWriteApi(
      config.get<string>('INFLUXDB_ORG'),
      config.get<string>('INFLUXDB_BUCKET'),
      'ms',
    );
    if (
      config.get<string>('INFLUXDB_BUCKET') === 'ironfish-telemetry-mainnet'
    ) {
      this.networkId = '1';
    }
    if (
      config.get<string>('INFLUXDB_BUCKET') === 'ironfish-telemetry-testnet'
    ) {
      this.networkId = '0';
    }
  }

  writePoints(options: CreatePointOptions[]): void {
    const points = [];

    for (const option of options) {
      const { fields, measurement, tags, timestamp } = option;
      const point = new Point(measurement).timestamp(timestamp);

      for (const field of fields) {
        const { name } = field;
        if (field.type === 'boolean') {
          point.booleanField(name, field.value);
        } else if (field.type === 'float') {
          point.floatField(name, field.value);
        } else if (field.type === 'integer') {
          point.intField(name, field.value);
        } else {
          point.stringField(name, field.value);
        }
      }

      for (const tag of tags) {
        if (tag.name === 'networkId' && tag.value !== this.networkId) {
          return;
        }
        point.tag(tag.name, tag.value);
      }

      points.push(point);
    }

    this.writeClient.writePoints(points);
  }

  async onModuleDestroy(): Promise<void> {
    await this.writeClient.close();
  }
}
