/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Res,
  UnprocessableEntityException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BlocksTransactionsLoaderService } from '../blocks-transactions-loader/block-transactions-loader.service';
import { List } from '../common/interfaces/list';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { BlocksService } from './blocks.service';
import { BlockQueryDto } from './dto/block-query.dto';
import { BlocksQueryDto } from './dto/blocks-query.dto';
import { DisconnectBlocksDto } from './dto/disconnect-blocks.dto';
import { UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { SerializedBlock } from './interfaces/serialized-block';
import { SerializedBlockWithTransactions } from './interfaces/serialized-block-with-transactions';
import {
  serializedBlockFromRecord,
  serializedBlockFromRecordWithTransactions,
} from './utils/block-translator';
import { Block } from '.prisma/client';

@Controller('blocks')
export class BlocksController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly blocksTransactionsLoaderService: BlocksTransactionsLoaderService,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async bulkUpsert(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    upsertBlocksDto: UpsertBlocksDto,
  ): Promise<List<SerializedBlock>> {
    const blocks = await this.blocksTransactionsLoaderService.bulkUpsert(
      upsertBlocksDto,
    );
    return {
      object: 'list',
      data: blocks.map((block) =>
        serializedBlockFromRecordWithTransactions(block),
      ),
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
    {
      after,
      before,
      limit,
      sequence_gte: sequenceGte,
      sequence_lt: sequenceLt,
      search,
      transaction_id: transactionId,
      with_transactions: withTransactions,
    }: BlocksQueryDto,
  ): Promise<PaginatedList<SerializedBlock | SerializedBlockWithTransactions>> {
    const maxBlocksToReturn = 1000;
    if (sequenceGte !== undefined && sequenceLt !== undefined) {
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
    }

    const { data, hasNext, hasPrevious } = await this.blocksService.list({
      after,
      before,
      limit,
      sequenceGte,
      sequenceLt,
      search,
      transactionId,
      withTransactions,
    });
    return {
      object: 'list',
      data: data.map((block) => {
        if ('transactions' in block) {
          return serializedBlockFromRecordWithTransactions(block);
        } else {
          return serializedBlockFromRecord(block);
        }
      }),
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
    };
  }

  @Get('find')
  async find(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { hash, sequence, with_transactions }: BlockQueryDto,
  ): Promise<SerializedBlock | SerializedBlockWithTransactions> {
    const block = await this.blocksService.find({
      hash,
      sequence,
      withTransactions: with_transactions,
    });
    if (block !== null && 'transactions' in block) {
      return serializedBlockFromRecordWithTransactions(block);
    } else if (block !== null) {
      return serializedBlockFromRecord(block);
    } else {
      throw new NotFoundException();
    }
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
