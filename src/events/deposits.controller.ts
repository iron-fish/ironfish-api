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
  @Post('fix_mismatches')
  @UseGuards(ApiKeyGuard)
  async fixMismatches(): Promise<void> {
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.FIX_MISMATCHED_DEPOSITS,
    );
  }
}
