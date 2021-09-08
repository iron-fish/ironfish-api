/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Client } from 'postmark';
import { ApiConfigService } from '../api-config/api-config.service';

@Injectable()
export class PostmarkService {
  private readonly client: Client;

  constructor(private readonly config: ApiConfigService) {
    this.client = new Client(this.config.get('POSTMARK_API_KEY'));
  }

  async send({
    alias,
    templateModel,
    to,
  }: {
    alias: string;
    templateModel: Record<string, unknown>;
    to: string;
  }): Promise<void> {
    await this.client.sendEmailWithTemplate({
      From: 'noreply@ironfish.network',
      To: to,
      TemplateAlias: alias,
      TemplateModel: templateModel,
    });
  }
}
