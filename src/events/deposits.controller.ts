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
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { DepositsService } from './deposits.service';
import { UpsertDepositsDto } from './dto/upsert-deposit.dto';
import { SerializedDeposit } from './interfaces/serialized-deposit';
@ApiTags('Deposit')
@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly configService: ApiConfigService,
    private readonly deposits: DepositsService,
  ) {}

  @ApiOperation({ summary: 'Gets the head of the chain' })
  @ApiExcludeEndpoint()
  @Get('head')
  async head(): Promise<{ block_hash: string }> {
    const depositHead = await this.deposits.head();

    if (!depositHead) {
      throw new NotFoundException();
    }

    return {
      block_hash: depositHead.block_hash,
    };
  }

  @ApiOperation({
    summary: 'Returns the Iron Bank public key',
  })
  @Get('address')
  ironBankPk(): { address: string } {
    const address = this.configService.get<string>('DEPOSIT_ADDRESS');
    return { address };
  }

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
    data: UpsertDepositsDto,
  ): Promise<SerializedDeposit[]> {
    const deposits = await this.deposits.upsertBulk(data.operations);

    return deposits.map((d) => ({
      id: d.id,
      transaction_hash: d.transaction_hash,
      block_sequence: d.block_sequence,
      block_hash: d.block_hash,
      object: 'deposit',
    }));
  }
}
