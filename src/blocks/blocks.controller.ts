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
  Res,
  UnprocessableEntityException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { List } from '../common/interfaces/list';
import { BlocksService } from './blocks.service';
import { BlocksQueryDto } from './dto/blocks-query.dto';
import { DisconnectBlocksDto } from './dto/disconnect-blocks.dto';
import { UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { Block } from '.prisma/client';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async bulkUpsert(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    blocks: UpsertBlocksDto,
  ): Promise<List<Block>> {
    return {
      data: await this.blocksService.bulkUpsert(blocks),
    };
  }

  @Get('head')
  async head(): Promise<Block> {
    return this.blocksService.head();
  }

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { sequence_gte: sequenceGte, sequence_lt: sequenceLt }: BlocksQueryDto,
  ): Promise<List<Block>> {
    const maxBlocksToReturn = 1000;
    if (sequenceGte >= sequenceLt) {
      throw new UnprocessableEntityException(
        `'sequence_gte' must be strictly less than 'sequence_lt'.`,
      );
    }
    if (sequenceLt - sequenceGte > maxBlocksToReturn) {
      throw new UnprocessableEntityException(
        `Range is too long. Max sequence difference is ${maxBlocksToReturn}.`,
      );
    }
    return {
      data: await this.blocksService.list(sequenceGte, sequenceLt),
    };
  }

  @Post('disconnect')
  @UseGuards(ApiKeyGuard)
  async disconnect(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { sequence_gt: sequenceGt }: DisconnectBlocksDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.blocksService.disconnectAfter(sequenceGt);
    res.sendStatus(HttpStatus.OK);
  }
}
