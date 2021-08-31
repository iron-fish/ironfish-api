/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Magic, MagicUserMetadata } from '@magic-sdk/admin';
import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../api-config/api-config.service';

@Injectable()
export class MagicLinkService {
  private readonly magic: Magic;

  constructor(private readonly config: ApiConfigService) {
    this.magic = new Magic(this.config.get('MAGIC_SECRET_KEY'));
  }

  validate(header: string): void {
    this.magic.token.validate(
      this.magic.utils.parseAuthorizationHeader(header),
    );
  }

  async getMetadataByHeader(header: string): Promise<MagicUserMetadata> {
    return this.magic.users.getMetadataByToken(
      this.magic.utils.parseAuthorizationHeader(header),
    );
  }
}
