/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { CreateAssetOptions } from './interfaces/create-asset-options';
import { ListAssetsOptions } from './interfaces/list-assets-optionts';
import { Asset, Prisma, Transaction } from '.prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(id: number): Promise<Asset> {
    return this.findOrThrowWithClient(id, this.prisma.readClient);
  }

  async findOrThrowWithClient(
    id: number,
    prisma: BasePrismaClient,
  ): Promise<Asset> {
    const record = await prisma.asset.findUnique({
      where: {
        id,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByIdentifierOrThrow(identifier: string): Promise<Asset> {
    return this.findByIdentifierOrThrowWithClient(identifier, this.prisma);
  }

  async findByIdentifierOrThrowWithClient(
    identifier: string,
    prisma: BasePrismaClient,
  ): Promise<Asset> {
    const record = await prisma.asset.findUnique({
      where: {
        identifier,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async upsert(
    options: CreateAssetOptions,
    transaction: Transaction,
    prisma: BasePrismaClient,
  ): Promise<Asset> {
    return prisma.asset.upsert({
      create: {
        identifier: options.identifier,
        metadata: options.metadata,
        name: options.name,
        owner: options.owner,
        supply: BigInt(0),
        created_transaction_id: transaction.id,
      },
      update: {},
      where: {
        identifier: options.identifier,
      },
    });
  }

  async updateSupply(
    asset: Asset,
    delta: bigint,
    prisma: BasePrismaClient,
  ): Promise<Asset> {
    return prisma.asset.update({
      data: {
        supply: {
          increment: delta,
        },
      },
      where: {
        id: asset.id,
      },
    });
  }

  async list(options: ListAssetsOptions): Promise<{
    data: Asset[];
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

    let where: Prisma.AssetWhereInput = {};
    if (options.search) {
      where = {
        name: {
          contains: options.search,
        },
      };
    }

    const data = await this.prisma.readClient.asset.findMany({
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
    data: Asset[],
    where: Prisma.AssetWhereInput,
    orderBy: Prisma.Enumerable<Prisma.AssetOrderByWithRelationInput>,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.readClient.asset.findMany({
      where,
      orderBy,
      cursor: { id: data[length - 1].id },
      skip: 1,
      take: 1,
    });
    const previousRecords = await this.prisma.readClient.asset.findMany({
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
