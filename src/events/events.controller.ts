/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { List } from '../common/interfaces/list';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { Event } from '.prisma/client';

@Controller('events')
export class EventsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { account_id, after, before, limit }: EventsQueryDto,
  ): Promise<List<Event>> {
    return {
      data: await this.eventsService.list({
        accountId: account_id,
        after,
        before,
        limit,
      }),
    };
  }

  @Post()
  @UseGuards(ApiKeyGuard)
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { public_address, points, type }: CreateEventDto,
  ): Promise<Event> {
    const account = await this.accountsService.findOrThrowByPublicAddress(
      public_address,
    );
    // TODO: Remove this. Leaving this for now so it's easy to remove accounts
    const tempUser = await this.prisma.user.create({
      data: {
        email: 'a@b.com',
        graffiti: 'asdf',
      },
    });
    return this.eventsService.create(type, account, tempUser, points);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard)
  async delete(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
  ): Promise<void> {
    await this.eventsService.delete(id);
  }
}
