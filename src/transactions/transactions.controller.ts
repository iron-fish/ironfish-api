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
import { List } from '../common/interfaces/list';
import { UpsertTransactionsDto } from './dto/upsert-transactions.dto';
import { TransactionsService } from './transactions.service';
import { Transaction } from '.prisma/client';

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
    transactions: UpsertTransactionsDto,
  ): Promise<List<Transaction>> {
    return {
      data: await this.transactionsService.bulkUpsert(transactions),
    };
  }
}
