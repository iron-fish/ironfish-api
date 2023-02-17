/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { AssetDescriptionType, Transaction } from '@prisma/client';
import { AssetDescriptionsService } from '../asset-descriptions/asset-descriptions.service';
import { AssetsService } from '../assets/assets.service';
import { standardizeHash } from '../common/utils/hash';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { TransactionDto } from '../transactions/dto/upsert-transactions.dto';
import { TransactionsService } from '../transactions/transactions.service';

const MAX_MINT_OR_BURN_VALUE = BigInt(100_000_000_000_000_000n);

@Injectable()
export class AssetsLoader {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetDescriptionsService: AssetDescriptionsService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async loadDescriptions(main: boolean, dto: TransactionDto): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const transaction = await this.transactionsService.findByHashOrThrow(
        standardizeHash(dto.hash),
        prisma,
      );

      if (main) {
        await this.createAssetDescriptions(dto, transaction, prisma);
      } else {
        await this.deleteAssetDescriptions(transaction, prisma);
      }
    });
  }

  private async createAssetDescriptions(
    dto: TransactionDto,
    transaction: Transaction,
    prisma: BasePrismaClient,
  ): Promise<void> {
    await this.deleteAssetDescriptions(transaction, prisma);

    for (const mint of dto.mints) {
      const asset = await this.assetsService.upsert(
        {
          identifier: mint.id,
          metadata: mint.metadata,
          name: mint.name,
          owner: mint.owner,
        },
        transaction,
        prisma,
      );

      if (BigInt(mint.value) > MAX_MINT_OR_BURN_VALUE) {
        continue;
      }

      await this.assetDescriptionsService.create(
        AssetDescriptionType.MINT,
        BigInt(mint.value),
        asset,
        transaction,
        prisma,
      );
      await this.assetsService.updateSupply(asset, BigInt(mint.value), prisma);
    }

    for (const burn of dto.burns) {
      if (BigInt(burn.value) > MAX_MINT_OR_BURN_VALUE) {
        continue;
      }

      const asset = await this.assetsService.findByIdentifierOrThrowWithClient(
        burn.id,
        prisma,
      );

      await this.assetDescriptionsService.create(
        AssetDescriptionType.BURN,
        BigInt(burn.value),
        asset,
        transaction,
        prisma,
      );
      await this.assetsService.updateSupply(asset, -BigInt(burn.value), prisma);
    }
  }

  private async deleteAssetDescriptions(
    transaction: Transaction,
    prisma: BasePrismaClient,
  ): Promise<void> {
    const assetDescriptions =
      await this.assetDescriptionsService.findByTransactionWithClient(
        transaction,
        prisma,
      );

    if (assetDescriptions.length === 0) {
      return;
    }

    this.logger.debug(
      `Deleting and re-processing descriptions for '${transaction.hash}'`,
    );

    for (const assetDescription of assetDescriptions) {
      const asset = await this.assetsService.findOrThrow(
        assetDescription.asset_id,
        prisma,
      );
      const delta =
        assetDescription.type === AssetDescriptionType.MINT
          ? -assetDescription.value
          : assetDescription.value;

      await this.assetsService.updateSupply(asset, delta, prisma);
    }

    await this.assetDescriptionsService.deleteByTransaction(
      transaction,
      prisma,
    );
  }
}
