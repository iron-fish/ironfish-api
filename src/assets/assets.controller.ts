/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { handleIfModifiedSince } from '../common/utils/request';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from './assets.service';
import { AssetQueryDto } from './dto/asset-query-dto';
import { AssetsQueryDto } from './dto/assets-query.dto';
import {
  UpdateVerifiedAssetsDto,
  VerifiedAssetMetadataDto,
} from './dto/update-verified-assets-dto';
import { SerializedAsset } from './interfaces/serialized-asset';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly blocksTransactionsService: BlocksTransactionsService,
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

    const blocks = await this.blocksTransactionsService.findBlocksByTransaction(
      transaction,
    );
    const block = blocks.find((block) => block.main);
    if (!block) {
      throw new NotFoundException();
    }

    return {
      object: 'asset',
      created_transaction_hash: transaction.hash,
      created_transaction_timestamp: block.timestamp.toISOString(),
      id: asset.id,
      identifier: asset.identifier,
      metadata: asset.metadata,
      name: asset.name,
      owner: asset.owner,
      supply: asset.supply.toString(),
      verified_at: asset.verified_metadata?.created_at.toISOString() ?? null,
    };
  }

  @ApiOperation({ summary: 'Lists assets' })
  @Get()
  @Header('Cache-Control', 's-maxage=60, stale-if-error=60')
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    dto: AssetsQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const lastUpdate = await this.assetsService.lastUpdate();
    if (lastUpdate) {
      handleIfModifiedSince(lastUpdate, req, res);
    }

    const { data, hasNext, hasPrevious } = await this.assetsService.list(dto);

    const serializedData: SerializedAsset[] = [];
    for (const asset of data) {
      const transaction = await this.transactionsService.findOrThrow(
        asset.created_transaction_id,
      );

      const blocks =
        await this.blocksTransactionsService.findBlocksByTransaction(
          transaction,
        );
      const block = blocks.find((block) => block.main);
      if (!block) {
        continue;
      }

      serializedData.push({
        object: 'asset',
        created_transaction_hash: transaction.hash,
        created_transaction_timestamp: block.timestamp.toISOString(),
        id: asset.id,
        identifier: asset.identifier,
        metadata: asset.metadata,
        name: asset.name,
        owner: asset.owner,
        supply: asset.supply.toString(),
        verified_at: asset.verified_metadata?.created_at.toISOString() ?? null,
      });
    }

    res.json({
      object: 'list',
      data: serializedData,
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
    });
  }

  @ApiOperation({ summary: 'Lists identifiers or verified assets' })
  @Get('verified')
  @Header('Cache-Control', 's-maxage=60, stale-if-error=60')
  async verified(@Req() req: Request, @Res() res: Response): Promise<void> {
    const lastUpdate = await this.assetsService.lastMetadataUpdate();
    if (lastUpdate) {
      handleIfModifiedSince(lastUpdate, req, res);
    }

    const assets = await this.assetsService.listVerifiedIdentifiers();

    res.json({ assets });
  }

  @ApiExcludeEndpoint()
  @Post('verified')
  @UseGuards(ApiKeyGuard)
  async updateVerified(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    dto: UpdateVerifiedAssetsDto,
    @Res() res: Response,
  ): Promise<void> {
    const missing: VerifiedAssetMetadataDto[] = [];
    for (const asset of dto.assets) {
      const result = await this.assetsService.updateVerified(asset);
      if (result === null) {
        missing.push(asset);
      }
    }

    await this.assetsService.deleteUnverified(dto.assets);

    res.status(HttpStatus.OK).json({ missing });
  }
}
