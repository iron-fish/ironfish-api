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
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetDescriptionsService } from '../asset-descriptions/asset-descriptions.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { List } from '../common/interfaces/list';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { UpsertTransactionsDto } from './dto/upsert-transactions.dto';
import { SerializedTransaction } from './interfaces/serialized-transaction';
import { SerializedTransactionWithBlocks } from './interfaces/serialized-transaction-with-blocks';
import { TransactionsService } from './transactions.service';
import {
  serializedTransactionFromRecord,
  serializedTransactionFromRecordWithBlocks,
} from './utils/transaction-translator';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly assetDescriptionsService: AssetDescriptionsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @ApiOperation({ summary: `Gets a specific transaction by 'hash'` })
  @Get('find')
  async find(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { hash, with_blocks }: TransactionQueryDto,
  ): Promise<SerializedTransaction | SerializedTransactionWithBlocks> {
    const transaction = await this.transactionsService.find({
      hash,
      withBlocks: with_blocks,
    });

    if (!transaction) {
      throw new NotFoundException();
    }

    const assetDescriptions =
      await this.assetDescriptionsService.findByTransaction(transaction);
    if ('blocks' in transaction) {
      return serializedTransactionFromRecordWithBlocks(
        transaction,
        assetDescriptions,
      );
    } else {
      return serializedTransactionFromRecord(transaction, assetDescriptions);
    }
  }

  @ApiExcludeEndpoint()
  @Post()
  @UseGuards(ApiKeyGuard)
  async bulkCreate(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    upsertTransactionsDto: UpsertTransactionsDto,
  ): Promise<List<SerializedTransaction>> {
    const transactions = await this.transactionsService.createMany(
      upsertTransactionsDto.transactions,
    );

    const data = [];
    for (const transaction of transactions) {
      const assetDescriptions =
        await this.assetDescriptionsService.findByTransaction(transaction);
      data.push(
        serializedTransactionFromRecord(transaction, assetDescriptions),
      );
    }

    return {
      object: 'list',
      data,
    };
  }

  @ApiOperation({
    summary: 'Returns a paginated list of transactions from the chain',
  })
  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { block_id, search, with_blocks }: TransactionsQueryDto,
  ): Promise<List<SerializedTransaction | SerializedTransactionWithBlocks>> {
    const transactions = await this.transactionsService.list({
      blockId: block_id,
      search,
      withBlocks: with_blocks,
    });

    const data = [];
    for (const transaction of transactions) {
      const assetDescriptions =
        await this.assetDescriptionsService.findByTransaction(transaction);

      if ('blocks' in transaction) {
        data.push(
          serializedTransactionFromRecordWithBlocks(
            transaction,
            assetDescriptions,
          ),
        );
      } else {
        data.push(
          serializedTransactionFromRecord(transaction, assetDescriptions),
        );
      }
    }

    return {
      data,
      object: 'list',
    };
  }
}
