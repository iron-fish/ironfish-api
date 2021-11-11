/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { List } from '../common/interfaces/list';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
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
  constructor(private readonly transactionsService: TransactionsService) {}

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
    if (transaction !== null && 'blocks' in transaction) {
      return serializedTransactionFromRecordWithBlocks(transaction);
    } else if (transaction !== null) {
      return serializedTransactionFromRecord(transaction);
    } else {
      throw new NotFoundException();
    }
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
    return {
      data: transactions.map((transaction) => {
        if ('blocks' in transaction) {
          return serializedTransactionFromRecordWithBlocks(transaction);
        } else {
          return serializedTransactionFromRecord(transaction);
        }
      }),
      object: 'list',
    };
  }
}
