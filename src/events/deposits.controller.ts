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
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { DepositsService } from './deposits.service';
import { DepositsUpsertService } from './deposits.upsert.service';
import { UpsertDepositsDto } from './dto/upsert-deposit.dto';
@ApiTags('Deposit')
@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly configService: ApiConfigService,
    private readonly depositsUpsert: DepositsUpsertService,
    private readonly deposits: DepositsService,
    private readonly graphileWorkerService: GraphileWorkerService,
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

  @ApiOperation({
    summary:
      'The min and max increment of IRON allowed to be deposited to Iron Bank',
  })
  @Get('min_and_max_deposit_size')
  minAndMaxDeposit(): { min_deposit_size: number; max_deposit_size: number } {
    const min_deposit_size = this.configService.get<number>('MIN_DEPOSIT_SIZE');
    const max_deposit_size = this.configService.get<number>('MAX_DEPOSIT_SIZE');
    return { min_deposit_size, max_deposit_size };
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
    @Res() res: Response,
  ): Promise<void> {
    await this.depositsUpsert.bulkUpsert(data.operations);
    res.sendStatus(HttpStatus.ACCEPTED);
  }

  @ApiExcludeEndpoint()
  @Post('refresh')
  @UseGuards(ApiKeyGuard)
  async refresh(): Promise<void> {
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.REFRESH_DEPOSITS,
    );
  }

  @ApiExcludeEndpoint()
  @Post('sync_to_telemetry')
  @UseGuards(ApiKeyGuard)
  async syncToTelemetry(): Promise<void> {
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.SUBMIT_DEPOSITED_IRON_TO_TELEMETRY,
    );
  }
}
