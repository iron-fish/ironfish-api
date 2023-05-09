/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { EventsService } from '../events/events.service';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { EventsQueryDto } from './dto/events-query.dto';
import { SerializedEvent } from './interfaces/serialized-event';
import { serializedEventFromRecordWithMetadata } from './utils/event-translator';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
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
      data: data.map((event) => serializedEventFromRecordWithMetadata(event)),
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard)
  async delete(
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
  ): Promise<void> {
    const event = await this.eventsService.findOrThrow(id);
    await this.eventsService.delete(event);
  }
}
