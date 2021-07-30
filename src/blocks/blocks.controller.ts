/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { BlockOperation } from './enums/block-operation';
import { Block } from '.prisma/client';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    {
      difficulty,
      hash,
      type,
      previous_block_hash,
      timestamp,
      transactions_count,
      sequence,
      graffiti,
    }: CreateBlockDto,
  ): Promise<Block> {
    const main = type === BlockOperation.CONNECTED;
    return this.blocksService.upsert(
      hash,
      sequence,
      difficulty,
      main,
      timestamp,
      transactions_count,
      graffiti,
      previous_block_hash,
    );
  }

  @Get('head')
  async head(): Promise<Block> {
    return this.blocksService.head()
  }
}
