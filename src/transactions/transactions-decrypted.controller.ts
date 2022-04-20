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

}
