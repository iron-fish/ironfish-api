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
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { EventsService } from '../events/events.service';
import { UsersService } from '../users/users.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { SerializedEvent } from './interfaces/serialized-event';
import { serializedEventFromRecord } from './utils/event-translator';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Returns a paginated list of events' })
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

  @ApiExcludeEndpoint()
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
  ): Promise<SerializedEvent | undefined> {
    const user = await this.usersService.findConfirmedByGraffitiOrThrow(
      graffiti,
    );
    const event = await this.eventsService.create({
      type,
      points,
      occurredAt,
      userId: user.id,
    });
    if (!event) {
      return undefined;
    }
    return serializedEventFromRecord(event);
  }
}
