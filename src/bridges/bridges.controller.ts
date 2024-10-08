/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { List } from '../common/interfaces/list';
import {
  ChainportIronFishMetadata,
  ChainportNetwork,
  ChainportPort,
  ChainportService,
  ChainportToken,
  ChainportTokenWithNetwork,
} from './chainport.service';
import { TransactionsCreateDto } from './dto/transactions-create.dto';
import { TransactionsStatusDto } from './dto/transactions-status.dto';
import { BridgesStatus } from './interfaces/bridge-status';

@ApiTags('Bridges')
@Controller('bridges')
export class BridgesController {
  constructor(private readonly chainportService: ChainportService) {}

  @ApiOperation({
    summary: 'Lists Iron Fish assets that can be bridged to other networks',
  })
  @Get('tokens')
  async tokens(): Promise<List<ChainportToken>> {
    const tokens = await this.chainportService.getVerifiedTokens();

    return {
      object: 'list',
      data: tokens,
    };
  }

  @ApiOperation({
    summary:
      'Lists all networks available by the bridge provider (some may not be bridgeable from Iron Fish)',
  })
  @Get('networks')
  async networks(): Promise<List<ChainportNetwork>> {
    const networks = await this.chainportService.getNetworks();

    return {
      object: 'list',
      data: networks,
    };
  }

  @ApiOperation({
    summary: 'Returns destination networks for a bridgeable token ID',
  })
  @Get('tokens/:token_id/networks')
  async tokenNetworks(
    @Param(
      'token_id',
      new ValidationPipe({
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    token_id: number,
  ): Promise<List<ChainportTokenWithNetwork>> {
    const networks = await this.chainportService.getTokenPaths(token_id);

    return {
      object: 'list',
      data: networks,
    };
  }

  @ApiOperation({
    summary:
      'Returns Iron Fish outputs and metadata required for creating a bridge transaction',
  })
  @Get('transactions/create')
  async transactionsCreate(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    query: TransactionsCreateDto,
  ): Promise<ChainportIronFishMetadata> {
    const transactionOutputs = await this.chainportService.getIronFishMetadata(
      query.amount,
      query.asset_id,
      query.target_network_id,
      query.target_address,
    );

    return transactionOutputs;
  }

  @ApiOperation({
    summary:
      'Returns transaction status for a source transaction hash and bridge network ID',
  })
  @Get('transactions/status')
  async transactionsStatus(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    query: TransactionsStatusDto,
  ): Promise<ChainportPort> {
    const transactionOutputs = await this.chainportService.getPort(
      query.hash,
      query.network_id,
    );

    return transactionOutputs;
  }

  @ApiOperation({
    summary: 'Returns the status for the supported bridges',
  })
  @Get('status')
  status(): BridgesStatus {
    return {
      chainport: this.chainportService.getStatus(),
    };
  }
}
