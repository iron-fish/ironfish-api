/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { CreateFaucetTransactionDto } from './dto/create-faucet-transaction.dto';
import { FaucetTransactionsService } from './faucet-transactions.service';
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
}
