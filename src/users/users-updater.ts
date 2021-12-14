/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserOptions } from './interfaces/update-user-options';
import { UsersService } from './users.service';
import { User } from '.prisma/client';

@Injectable()
export class UsersUpdater {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async update(user: User, options: UpdateUserOptions): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      const { discord, graffiti, telegram } = options;

      if (graffiti && user.graffiti !== graffiti) {
        const minedBlocksForCurrentGraffiti =
          await this.blocksService.countByGraffiti(user.graffiti, prisma);
        if (minedBlocksForCurrentGraffiti > 0) {
          throw new UnprocessableEntityException({
            code: 'user_graffiti_already_used',
            message: `Current graffiti '${user.graffiti}' has already mined blocks`,
          });
        }

        const minedBlocksForNewGraffiti =
          await this.blocksService.countByGraffiti(graffiti, prisma);
        if (minedBlocksForNewGraffiti > 0) {
          throw new UnprocessableEntityException({
            code: 'duplicate_block_graffiti',
            message: `Blocks with '${graffiti}' already exist`,
          });
        }
      }

      const users = await this.usersService.findDuplicateUser(
        user,
        options,
        prisma,
      );
      if (users.length) {
        const duplicateUser = users[0];
        let error;

        if (discord && discord === duplicateUser.discord) {
          error = {
            code: 'duplicate_user_discord',
            message: `User with Discord '${discord}' already exists`,
          };
        } else if (graffiti && graffiti === duplicateUser.graffiti) {
          error = {
            code: 'duplicate_user_graffiti',
            message: `User with graffiti '${graffiti}' already exists`,
          };
        } else if (telegram && telegram === duplicateUser.telegram) {
          error = {
            code: 'duplicate_user_telegram',
            message: `User with Telegram '${telegram}' already exists`,
          };
        } else {
          throw new Error('Unexpected database response');
        }

        throw new UnprocessableEntityException(error);
      }

      return this.usersService.update(user, options, prisma);
    });
  }
}
