/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { List } from '../common/interfaces/list';
import { CompleteFaucetTransactionDto } from './dto/complete-faucet-transaction.dto';
import { CreateFaucetTransactionDto } from './dto/create-faucet-transaction.dto';
import { NextFaucetTransactionsDto } from './dto/next-faucet-transactions.dto';
import { FaucetTransactionsService } from './faucet-transactions.service';
import { FaucetTransactionsStatus } from './interfaces/faucet-transactions-status';
import { SerializedFaucetTransaction } from './interfaces/serialized-faucet-transaction';
import { serializedFaucetTransactionFromRecord } from './utils/faucet-transactions.translator';

@ApiTags('Faucet Transactions')
@Controller('faucet_transactions')
export class FaucetTransactionsController {
  constructor(
    private readonly config: ApiConfigService,
    private readonly faucetTransactionsService: FaucetTransactionsService,
  ) {}

  @ApiExcludeEndpoint()
  @Post()
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    { email, public_key: publicKey }: CreateFaucetTransactionDto,
  ): Promise<SerializedFaucetTransaction> {
    if (this.config.get<boolean>('DISABLE_FAUCET')) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: 'The faucet has been disabled, try joining a mining pool!',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return serializedFaucetTransactionFromRecord(
      await this.faucetTransactionsService.create({ email, publicKey }),
    );
  }

  @ApiExcludeEndpoint()
  @Get('next')
  @UseGuards(ApiKeyGuard)
  async next(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { count }: NextFaucetTransactionsDto,
  ): Promise<List<SerializedFaucetTransaction>> {
    const nextFaucetTransactions = await this.faucetTransactionsService.next({
      count,
    });

    return {
      object: 'list',
      data: nextFaucetTransactions.map((nextFaucetTransaction) =>
        serializedFaucetTransactionFromRecord(nextFaucetTransaction),
      ),
    };
  }

  @ApiOperation({ summary: 'Returns the global status of faucet transactions' })
  @Get('status')
  async status(): Promise<FaucetTransactionsStatus> {
    return this.faucetTransactionsService.getGlobalStatus();
  }

  @ApiOperation({ summary: 'Gets a specific Faucet Transaction' })
  @ApiParam({ description: 'Unique Faucet Transaction identifier', name: 'id' })
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

  @ApiExcludeEndpoint()
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

  @ApiExcludeEndpoint()
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
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    dto: CompleteFaucetTransactionDto,
  ): Promise<SerializedFaucetTransaction> {
    const record = await this.faucetTransactionsService.findOrThrow(id);
    return serializedFaucetTransactionFromRecord(
      await this.faucetTransactionsService.complete(record, dto),
    );
  }
}
