/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from './assets.service';
import { AssetQueryDto } from './dto/asset-query-dto';
import { SerializedAsset } from './interfaces/serialized-asset';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @ApiOperation({ summary: 'Gets an asset by identifier' })
  @Get('find')
  async find(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { id }: AssetQueryDto,
  ): Promise<SerializedAsset> {
    const asset = await this.assetsService.findByIdentifierOrThrow(id);
    const transaction = await this.transactionsService.findOrThrow(
      asset.created_transaction_id,
    );
    return {
      object: 'asset',
      created_transaction_hash: transaction.hash,
      id: asset.id,
      identifier: asset.identifier,
      metadata: asset.metadata,
      name: asset.name,
      owner: asset.owner,
      supply: asset.supply.toString(),
    };
  }
}
