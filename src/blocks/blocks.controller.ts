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
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BlocksTransactionsLoader } from '../blocks-transactions-loader/block-transactions-loader';
import { List } from '../common/interfaces/list';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { BlocksService } from './blocks.service';
import { BlockQueryDto } from './dto/block-query.dto';
import { BlocksQueryDto } from './dto/blocks-query.dto';
import { DisconnectBlocksDto } from './dto/disconnect-blocks.dto';
import { UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { SerializedBlock } from './interfaces/serialized-block';
import { SerializedBlockWithTransactions } from './interfaces/serialized-block-with-transactions';
import { SerializedBlocksStatus } from './interfaces/serialized-blocks-status';
import {
  serializedBlockFromRecord,
  serializedBlockFromRecordWithTransactions,
} from './utils/block-translator';
import { serializedBlocksStatusFromRecord } from './utils/blocks-status-translator';

@ApiTags('Blocks')
@Controller('blocks')
export class BlocksController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly blocksTransactionsLoader: BlocksTransactionsLoader,
  ) {}

  @ApiExcludeEndpoint()
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
    const blocks = await this.blocksTransactionsLoader.bulkUpsert(
      upsertBlocksDto,
    );
    return {
      object: 'list',
      data: blocks.map((block) =>
        serializedBlockFromRecordWithTransactions(block),
      ),
    };
  }

  @ApiOperation({ summary: 'Gets the head of the chain' })
  @Get('head')
  async head(): Promise<SerializedBlock> {
    return serializedBlockFromRecord(await this.blocksService.head());
  }

  @ApiOperation({
    summary: 'Returns a paginated list of blocks from the chain',
  })
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
      main,
      sequence_gte: sequenceGte,
      sequence_lt: sequenceLt,
      search,
      transaction_id: transactionId,
      with_transactions: withTransactions,
    }: BlocksQueryDto,
  ): Promise<PaginatedList<SerializedBlock | SerializedBlockWithTransactions>> {
    const maxBlocksToReturn = 1000;
    console.log(main);
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
      main,
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

  @ApiOperation({ summary: 'Returns the global status of the chain' })
  @Get('status')
  async status(): Promise<SerializedBlocksStatus> {
    const blocksStatus = await this.blocksService.getStatus();
    return serializedBlocksStatusFromRecord(blocksStatus);
  }

  @ApiOperation({ summary: `Gets a specific block by 'hash' or 'sequence'` })
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

  @ApiExcludeEndpoint()
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
