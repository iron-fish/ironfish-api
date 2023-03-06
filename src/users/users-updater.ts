/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserOptions } from './interfaces/update-user-options';
import { UsersService } from './users.service';
import { User } from '.prisma/client';

@Injectable()
export class UsersUpdater {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async update(user: User, options: UpdateUserOptions): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      const { discord, github, telegram } = options;

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
        } else if (github && github === duplicateUser.github) {
          error = {
            code: 'duplicate_user_github',
            message: `User with github '${github}' already exists`,
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
