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
import { AssetDescriptionsService } from '../asset-descriptions/asset-descriptions.service';
import { AssetsService } from '../assets/assets.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { BlocksTransactionsLoader } from '../blocks-transactions-loader/blocks-transactions-loader';
import { MS_PER_DAY } from '../common/constants';
import { MetricsGranularity } from '../common/enums/metrics-granularity';
import { List } from '../common/interfaces/list';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { divide } from '../common/utils/bigint';
import { serializedTransactionFromRecord } from '../transactions/utils/transaction-translator';
import { BlocksService } from './blocks.service';
import { BlockQueryDto } from './dto/block-query.dto';
import { BlocksMetricsQueryDto } from './dto/blocks-metrics-query.dto';
import { BlocksQueryDto } from './dto/blocks-query.dto';
import { DisconnectBlocksDto } from './dto/disconnect-blocks.dto';
import { UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { SerializedBlock } from './interfaces/serialized-block';
import { SerializedBlockHead } from './interfaces/serialized-block-head';
import { SerializedBlockMetrics } from './interfaces/serialized-block-metrics';
import { SerializedBlockWithTransactions } from './interfaces/serialized-block-with-transactions';
import { SerializedBlocksStatus } from './interfaces/serialized-blocks-status';
import {
  serializedBlockFromRecord,
  serializedBlockFromRecordWithTransactions,
} from './utils/block-translator';
import { serializedBlockMetricsFromRecord } from './utils/blocks-metrics-translator';
import { serializedBlocksStatusFromRecord } from './utils/blocks-status-translator';
import { Asset, AssetDescription, Transaction } from '.prisma/client';

const MAX_SUPPORTED_TIME_RANGE_IN_DAYS = 90;

@ApiTags('Blocks')
@Controller('blocks')
export class BlocksController {
  constructor(
    private readonly assetDescriptionsService: AssetDescriptionsService,
    private readonly assetsService: AssetsService,
    private readonly blocksDailyService: BlocksDailyService,
    private readonly blocksService: BlocksService,
    private readonly blocksTransactionsLoader: BlocksTransactionsLoader,
  ) {}

  @ApiExcludeEndpoint()
  @Post()
  @UseGuards(ApiKeyGuard)
  async createMany(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    upsertBlocksDto: UpsertBlocksDto,
  ): Promise<List<SerializedBlock>> {
    const blocks = await this.blocksTransactionsLoader.createMany(
      upsertBlocksDto,
    );

    const data = [];
    for (const block of blocks) {
      const serializedTransactions = [];
      for (const transaction of block.transactions) {
        const assetDescriptionsWithAssets =
          await this.getAssetDescriptionsWithAssets(transaction);
        serializedTransactions.push(
          serializedTransactionFromRecord(
            transaction,
            assetDescriptionsWithAssets,
          ),
        );
      }

      data.push(
        serializedBlockFromRecordWithTransactions(
          block,
          serializedTransactions,
        ),
      );
    }

    return {
      object: 'list',
      data,
    };
  }

  @ApiOperation({ summary: 'Gets the head of the chain' })
  @Get('head')
  async head(): Promise<SerializedBlockHead> {
    const head = await this.blocksService.head();
    const previous = await this.blocksService.find({
      hash: head.previous_block_hash,
    });

    let hashRate = 0;
    if (previous && previous.work !== null && head.work !== null) {
      const workDifference = head.work - previous.work;
      const diffInMs = head.timestamp.getTime() - previous.timestamp.getTime();
      hashRate = divide(workDifference, BigInt(diffInMs)) * 1000;
    }

    return {
      ...serializedBlockFromRecord(head),
      hash_rate: hashRate,
    };
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

    const {
      data: blocks,
      hasNext,
      hasPrevious,
    } = await this.blocksService.list({
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

    const data = [];
    for (const block of blocks) {
      if ('transactions' in block) {
        const serializedTransactions = [];
        for (const transaction of block.transactions) {
          const assetDescriptionsWithAssets =
            await this.getAssetDescriptionsWithAssets(transaction);
          serializedTransactions.push(
            serializedTransactionFromRecord(
              transaction,
              assetDescriptionsWithAssets,
            ),
          );
        }

        data.push(
          serializedBlockFromRecordWithTransactions(
            block,
            serializedTransactions,
          ),
        );
      } else {
        data.push(serializedBlockFromRecord(block));
      }
    }

    return {
      object: 'list',
      data,
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
      const serializedTransactions = [];

      for (const transaction of block.transactions) {
        const assetDescriptionsWithAssets =
          await this.getAssetDescriptionsWithAssets(transaction);
        serializedTransactions.push(
          serializedTransactionFromRecord(
            transaction,
            assetDescriptionsWithAssets,
          ),
        );
      }

      return serializedBlockFromRecordWithTransactions(
        block,
        serializedTransactions,
      );
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

  @ApiOperation({ summary: 'Gets metrics for blocks' })
  @Get('metrics')
  async metrics(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    query: BlocksMetricsQueryDto,
  ): Promise<List<SerializedBlockMetrics>> {
    const { isValid, error } = this.isValidMetricsQuery(query);
    if (!isValid) {
      throw new UnprocessableEntityException(error);
    }

    const records = await this.blocksDailyService.list(query.start, query.end);
    return {
      object: 'list',
      data: records.map(serializedBlockMetricsFromRecord),
    };
  }

  private isValidMetricsQuery({
    start,
    end,
    granularity,
  }: BlocksMetricsQueryDto): {
    isValid: boolean;
    error?: string;
  } {
    if (granularity !== MetricsGranularity.DAY) {
      return {
        isValid: false,
        error: '"granularity" must be "day"',
      };
    }
    if (start >= end) {
      return {
        isValid: false,
        error: '"start" must be stricly less than "end"',
      };
    }

    const diffInMs = end.getTime() - start.getTime();
    const diffInDays = diffInMs / MS_PER_DAY;
    if (diffInDays > MAX_SUPPORTED_TIME_RANGE_IN_DAYS) {
      return {
        isValid: false,
        error: 'Time range too long',
      };
    }
    return { isValid: true };
  }

  private async getAssetDescriptionsWithAssets(
    transaction: Transaction,
  ): Promise<{ asset: Asset; assetDescription: AssetDescription }[]> {
    const assetDescriptions =
      await this.assetDescriptionsService.findByTransaction(transaction);

    const assetDescriptionsWithAssets = [];
    for (const assetDescription of assetDescriptions) {
      assetDescriptionsWithAssets.push({
        asset: await this.assetsService.findOrThrow(assetDescription.asset_id),
        assetDescription,
      });
    }

    return assetDescriptionsWithAssets;
  }
}
