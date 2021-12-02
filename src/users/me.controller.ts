/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { SerializedUser } from './interfaces/serialized-user';
import { serializedUserFromRecord } from './utils/user-translator';

@ApiExcludeController()
@Controller('me')
export class MeController {
  @Get()
  @UseGuards(MagicLinkGuard)
  me(@Context() { user }: MagicLinkContext): SerializedUser {
    return serializedUserFromRecord(user);
  }
}
