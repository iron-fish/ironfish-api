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
import {
  ASSET_METADATA_SCHEMA_VERSION,
  NATIVE_ASSET_ID,
} from '../common/constants';
import { handleIfModifiedSince } from '../common/utils/request';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from './assets.service';
import { AssetQueryDto } from './dto/asset-query-dto';
import { AssetsQueryDto } from './dto/assets-query.dto';
import {
  UpdateVerifiedAssetsDto,
  VerifiedAssetMetadataDto,
} from './dto/update-verified-assets-dto';
import {
  SerializedAsset,
  serializeVerifiedAssetMetadata,
} from './interfaces/serialized-asset';

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
      creator: asset.creator,
      owner: asset.owner,
      supply: asset.supply.toString(),
      verified_at: asset.verified_metadata?.created_at.toISOString() ?? null,
      verified_metadata: asset.verified_metadata
        ? serializeVerifiedAssetMetadata(asset.verified_metadata)
        : null,
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
        creator: asset.creator,
        owner: asset.owner,
        supply: asset.supply.toString(),
        verified_at: asset.verified_metadata?.created_at.toISOString() ?? null,
        verified_metadata: asset.verified_metadata
          ? serializeVerifiedAssetMetadata(asset.verified_metadata)
          : null,
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

  /**
   * @deprecated
   * Replaced by the `assets/verified_metadata` endpoint. This endpoint is kept for older nodes.
   * Older nodes should treat the native asset IRON as the only verified asset since future assets
   * may require additional fields like `decimals` which this endpoint does not provide.
   */
  @ApiOperation({ summary: 'Lists identifiers of verified assets' })
  @Get('verified')
  @Header('Cache-Control', 's-maxage=60, stale-if-error=60')
  verified(@Req() req: Request, @Res() res: Response): void {
    const lastUpdate = new Date('01 Apr 2024 GMT');
    if (lastUpdate) {
      handleIfModifiedSince(lastUpdate, req, res);
    }

    res.json({
      assets: [
        {
          identifier: NATIVE_ASSET_ID,
        },
      ],
    });
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

  @ApiOperation({ summary: 'Lists all verified asset metadata' })
  @Get('verified_metadata')
  @Header('Cache-Control', 's-maxage=60, stale-if-error=60')
  async verifiedMetadata(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const lastUpdate = await this.assetsService.lastMetadataUpdate();
    if (lastUpdate) {
      handleIfModifiedSince(lastUpdate, req, res);
    }

    const assetsMetadata = (await this.assetsService.listMetadata()).map(
      (m) => {
        return {
          identifier: m.identifier,
          symbol: m.symbol,
          ...(m.decimals != null && { decimals: m.decimals }),
          ...(m.logo_uri != null && { logoURI: m.logo_uri }),
          ...(m.website != null && { website: m.website }),
        };
      },
    );

    res.json({
      schemaVersion: ASSET_METADATA_SCHEMA_VERSION,
      assets: assetsMetadata,
    });
  }
}
