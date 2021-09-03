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
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { List } from '../common/interfaces/list';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { UpsertTransactionsDto } from './dto/upsert-transactions.dto';
import { SerializedTransaction } from './interfaces/serialized-transaction';
import { SerializedTransactionWithBlock } from './interfaces/serialized-transaction-with-block';
import { TransactionsService } from './transactions.service';
import {
  serializedTransactionFromRecord,
  serializedTransactionFromRecordWithBlock,
} from './utils/transaction-translator';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async bulkUpsert(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    upsertTransactionsDto: UpsertTransactionsDto,
  ): Promise<List<SerializedTransaction>> {
    const transactions = await this.transactionsService.bulkUpsert(
      upsertTransactionsDto,
    );
    return {
      data: transactions.map((transaction) =>
        serializedTransactionFromRecord(transaction),
      ),
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
    { hash, with_block }: TransactionQueryDto,
  ): Promise<SerializedTransaction | SerializedTransactionWithBlock> {
    const transaction = await this.transactionsService.find({
      hash,
      with_block,
    });
    if (transaction !== null && 'block' in transaction) {
      return serializedTransactionFromRecordWithBlock(
        transaction,
        transaction.block,
      );
    } else if (transaction !== null) {
      return serializedTransactionFromRecord(transaction);
    } else {
      throw new NotFoundException();
    }
  }

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { search, with_block }: TransactionsQueryDto,
  ): Promise<List<SerializedTransaction | SerializedTransactionWithBlock>> {
    const transactions = await this.transactionsService.list({
      search,
      with_block,
    });
    return {
      data: transactions.map((transaction) => {
        if ('block' in transaction) {
          return serializedTransactionFromRecordWithBlock(
            transaction,
            transaction.block,
          );
        } else {
          return serializedTransactionFromRecord(transaction);
        }
      }),
    };
  }
}
