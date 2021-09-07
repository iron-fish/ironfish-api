/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Get } from '@nestjs/common';
import { PostmarkService } from '../postmark/postmark.service';

@Controller('health')
export class HealthController {
  constructor(private readonly postmarkService: PostmarkService) {}
  @Get()
  async health(): Promise<string> {
    await this.postmarkService.send();
    return 'OK';
  }
}
