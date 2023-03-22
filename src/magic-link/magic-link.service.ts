/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Magic, MagicUserMetadata } from '@magic-sdk/admin';
import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../api-config/api-config.service';
import { standardizeEmail } from '../common/utils/email';

@Injectable()
export class MagicLinkService {
  private readonly magic: Magic;

  constructor(private readonly config: ApiConfigService) {
    this.magic = new Magic(this.config.get('MAGIC_SECRET_KEY'));
  }

  async getEmailFromHeader(header: string): Promise<string> {
    const didToken = this.magic.utils.parseAuthorizationHeader(header);
    return this.getEmailFromToken(didToken);
  }

  async getEmailFromToken(didToken: string): Promise<string> {
    try {
      this.magic.token.validate(didToken);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Fail to validate token. ${err.message}`);
      }

      throw new Error(`Fail to validate token.`);
    }

    const { email } = await this.getMetadataFromToken(didToken);
    if (!email) {
      throw new Error('No email found for token');
    }
    return standardizeEmail(email);
  }

  private async getMetadataFromToken(
    didToken: string,
  ): Promise<MagicUserMetadata> {
    return this.magic.users.getMetadataByToken(didToken);
  }
}
