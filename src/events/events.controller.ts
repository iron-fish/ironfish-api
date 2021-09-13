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
import { PaginatedList } from '../common/interfaces/paginated-list';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { SerializedEvent } from './interfaces/serialized-event';
import { serializedEventFromRecord } from './utils/event-translator';

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
  ): Promise<PaginatedList<SerializedEvent>> {
    const { data, hasNext, hasPrevious } = await this.eventsService.list({
      userId: user_id,
      after,
      before,
      limit,
    });
    return {
      object: 'list',
      data: data.map((event) => serializedEventFromRecord(event)),
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
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
    { graffiti, points, type, occurred_at: occurredAt }: CreateEventDto,
  ): Promise<SerializedEvent> {
    const user = await this.usersService.findOrThrowByGraffiti(graffiti);
    return serializedEventFromRecord(
      await this.eventsService.create({
        type,
        points,
        occurredAt,
        userId: user.id,
      }),
    );
  }
}
