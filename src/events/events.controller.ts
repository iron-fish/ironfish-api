/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { List } from '../common/interfaces/list';
import { EventsService } from '../events/events.service';
import { EventsQueryDto } from './dto/events-query.dto';
import { Event } from '.prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
}
