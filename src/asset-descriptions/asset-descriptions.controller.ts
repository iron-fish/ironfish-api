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
import { AssetsService } from '../assets/assets.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetDescriptionsService } from './asset-descriptions.service';
import { AssetDescriptionsQueryDto } from './dto/asset-descriptions-query.dto';
import { SerializedAssetDescriptionWithTimestamp } from './interfaces/serialized-asset-description';
import { serializedAssetDescriptionWithTimestampFromRecord } from './utils/asset-descriptions.translator';

@ApiTags('AssetDescriptions')
@Controller('asset_descriptions')
export class AssetDescriptionsController {
  constructor(
    private readonly assetDescriptionsService: AssetDescriptionsService,
    private readonly assetsService: AssetsService,
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @ApiOperation({ summary: 'Lists asset descriptions' })
  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { asset: assetIdentifier, after, before, limit }: AssetDescriptionsQueryDto,
  ): Promise<PaginatedList<SerializedAssetDescriptionWithTimestamp>> {
    const asset = await this.assetsService.findByIdentifierOrThrow(
      assetIdentifier,
    );
    const { data, hasNext, hasPrevious } =
      await this.assetDescriptionsService.list({
        assetId: asset.id,
        after,
        before,
        limit,
      });

    const serializedData: SerializedAssetDescriptionWithTimestamp[] = [];
    for (const record of data) {
      const transaction = await this.transactionsService.findOrThrow(
        record.transaction_id,
      );
      const blocks =
        await this.blocksTransactionsService.findBlocksByTransaction(
          transaction,
        );
      // Skip non main chain descriptions
      const block = blocks.find((block) => block.main);
      if (!block) {
        continue;
      }

      serializedData.push(
        serializedAssetDescriptionWithTimestampFromRecord(
          record,
          transaction,
          block,
        ),
      );
    }

    return {
      object: 'list',
      data: serializedData,
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
    };
  }
}
