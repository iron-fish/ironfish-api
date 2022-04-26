/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { DepositsService } from './deposits.service';
import { SerializedDeposit } from './interfaces/serialized-deposit';

@ApiTags('Deposit')
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositService: DepositsService) {}

  @ApiOperation({ summary: 'Gets the head of the chain' })
  @UseGuards(ApiKeyGuard)
  @Get('head')
  async head(): Promise<{ deposit: SerializedDeposit | null }> {
    const deposit = await this.depositService.head();

    if (!deposit) {
      return { deposit: null };
    }

    return {
      deposit: {
        id: deposit.id,
        transaction_hash: deposit.transaction_hash,
        block_sequence: deposit.block_sequence,
        block_hash: deposit.block_hash,
        object: 'deposit',
      },
    };
  }
}
