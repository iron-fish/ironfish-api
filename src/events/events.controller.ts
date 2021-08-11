/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { List } from '../common/interfaces/list';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { Event } from '.prisma/client';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { user_id, after, before, limit }: EventsQueryDto,
  ): Promise<List<Event>> {
    return {
      data: await this.eventsService.list({
        userId: user_id,
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
    { graffiti, points, type }: CreateEventDto,
  ): Promise<Event> {
    const user = await this.usersService.findOrThrowByGraffiti(graffiti);
    return this.eventsService.create({ type, points, userId: user.id });
  }
}
