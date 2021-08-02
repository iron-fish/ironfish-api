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
import { List } from '../common/interfaces/list';
import { BlocksService } from './blocks.service';
import { CreateBlocksDto } from './dto/create-blocks.dto';
import { Block } from '.prisma/client';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async bulkCreate(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    blocks: CreateBlocksDto,
  ): Promise<List<Block>> {
    return {
      data: await this.blocksService.bulkUpsert(blocks),
    };
  }

  @Get('head')
  async head(): Promise<Block> {
    return this.blocksService.head();
  }
}
