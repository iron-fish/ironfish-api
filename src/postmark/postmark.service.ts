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

  async send(): Promise<void> {
    await this.client.sendEmail({
      From: 'noreply@ironfish.network',
      To: 'rohan@ironfish.network',
      Subject: 'The Boys',
      TextBody: 'Congrats! By receiving this email, your boss is obligated to buy you a lambo'
    });
  }
}
