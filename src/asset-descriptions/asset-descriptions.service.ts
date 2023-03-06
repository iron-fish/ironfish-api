/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import {
  Asset,
  AssetDescription,
  AssetDescriptionType,
  Prisma,
  Transaction,
} from '@prisma/client';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { ListAssetDescriptionsOptions } from './interfaces/list-asset-descriptions-options';

@Injectable()
export class AssetDescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    type: AssetDescriptionType,
    value: bigint,
    asset: Asset,
    transaction: Transaction,
    prisma: BasePrismaClient,
  ): Promise<AssetDescription> {
    return prisma.assetDescription.create({
      data: {
        type,
        value,
        asset_id: asset.id,
        transaction_id: transaction.id,
      },
    });
  }

  async findByTransaction(
    transaction: Transaction,
  ): Promise<AssetDescription[]> {
    return this.findByTransactionWithClient(
      transaction,
      this.prisma.readClient,
    );
  }

  async findByTransactionWithClient(
    transaction: Transaction,
    prisma: BasePrismaClient,
  ): Promise<AssetDescription[]> {
    return prisma.assetDescription.findMany({
      where: {
        transaction_id: transaction.id,
      },
    });
  }

  async deleteByTransaction(
    transaction: Transaction,
    prisma: BasePrismaClient,
  ): Promise<void> {
    await prisma.assetDescription.deleteMany({
      where: {
        transaction_id: transaction.id,
      },
    });
  }

  async list(options: ListAssetDescriptionsOptions): Promise<{
    data: AssetDescription[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const orderBy = { id: SortOrder.DESC };
    const skip = cursor ? 1 : 0;
    const where = {
      asset_id: options.assetId,
    };
    const data = await this.prisma.assetDescription.findMany({
      cursor,
      orderBy,
      skip,
      take: limit,
      where,
    });

    return {
      data,
      ...(await this.getListMetadata(data, where, orderBy)),
    };
  }

  private async getListMetadata(
    data: AssetDescription[],
    where: Prisma.AssetDescriptionWhereInput,
    orderBy: Prisma.Enumerable<Prisma.AssetDescriptionOrderByWithRelationInput>,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.assetDescription.findMany({
      where,
      orderBy,
      cursor: { id: data[length - 1].id },
      skip: 1,
      take: 1,
    });
    const previousRecords = await this.prisma.assetDescription.findMany({
      where,
      orderBy,
      cursor: { id: data[0].id },
      skip: 1,
      take: -1,
    });
    return {
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
  }
}
