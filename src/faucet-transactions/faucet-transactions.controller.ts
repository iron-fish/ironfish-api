/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CreateFaucetTransactionDto } from './dto/create-faucet-transaction.dto';
import { FaucetTransactionsService } from './faucet-transactions.service';
import { FaucetTransactionsStatus } from './interfaces/faucet-transactions-status';
import { SerializedFaucetTransaction } from './interfaces/serialized-faucet-transaction';
import { serializedFaucetTransactionFromRecord } from './utils/faucet-transactions.translator';

@Controller('faucet_transactions')
export class FaucetTransactionsController {
  constructor(
    private readonly faucetTransactionsService: FaucetTransactionsService,
  ) {}

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    { email, public_key: publicKey }: CreateFaucetTransactionDto,
  ): Promise<SerializedFaucetTransaction> {
    return serializedFaucetTransactionFromRecord(
      await this.faucetTransactionsService.create({ email, publicKey }),
    );
  }

  @Get('next')
  @UseGuards(ApiKeyGuard)
  async next(): Promise<SerializedFaucetTransaction> {
    const nextFaucetTransaction = await this.faucetTransactionsService.next();
    if (!nextFaucetTransaction) {
      throw new NotFoundException();
    }
    return serializedFaucetTransactionFromRecord(nextFaucetTransaction);
  }

  @Get('status')
  async status(): Promise<FaucetTransactionsStatus> {
    return this.faucetTransactionsService.getGlobalStatus();
  }

  @Get(':id')
  async find(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
  ): Promise<SerializedFaucetTransaction> {
    const record = await this.faucetTransactionsService.findOrThrow(id);
    return serializedFaucetTransactionFromRecord(record);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  async start(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
  ): Promise<SerializedFaucetTransaction> {
    const record = await this.faucetTransactionsService.findOrThrow(id);
    return serializedFaucetTransactionFromRecord(
      await this.faucetTransactionsService.start(record),
    );
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  async complete(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
  ): Promise<SerializedFaucetTransaction> {
    const record = await this.faucetTransactionsService.findOrThrow(id);
    return serializedFaucetTransactionFromRecord(
      await this.faucetTransactionsService.complete(record),
    );
  }
}
