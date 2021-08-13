/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Magic, MagicUserMetadata } from '@magic-sdk/admin';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MagicLinkService {
  private readonly magic: Magic;

  constructor(private readonly config: ConfigService) {
    this.magic = new Magic(this.config.get('MAGIC_SECRET_KEY'));
  }

  validate(didToken: string): void {
    this.magic.token.validate(didToken);
  }

  async getMetadataByToken(didToken: string): Promise<MagicUserMetadata> {
    return this.magic.users.getMetadataByToken(didToken);
  }
}
