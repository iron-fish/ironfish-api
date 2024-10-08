/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { VerifiedAssetMetadata } from '@prisma/client';
import { DEFAULT_LIMIT, MAX_LIMIT, NATIVE_ASSET_ID } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { VerifiedAssetMetadataDto } from './dto/update-verified-assets-dto';
import { CreateAssetOptions } from './interfaces/create-asset-options';
import { ListAssetsOptions } from './interfaces/list-assets-options';
import { Asset, Prisma, Transaction } from '.prisma/client';

export type AssetWithMetadata = Asset & {
  verified_metadata?: VerifiedAssetMetadata | null | undefined;
};

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

  async findByIdentifier(
    identifier: string,
  ): Promise<AssetWithMetadata | null> {
    return this.prisma.asset.findUnique({
      where: { identifier },
      include: { verified_metadata: true },
    });
  }

  async findByIdentifierOrThrow(
    identifier: string,
  ): Promise<AssetWithMetadata> {
    return this.findByIdentifierOrThrowWithClient(identifier, this.prisma);
  }

  async findByIdentifierOrThrowWithClient(
    identifier: string,
    prisma: BasePrismaClient,
  ): Promise<AssetWithMetadata> {
    const record = await prisma.asset.findUnique({
      include: {
        verified_metadata: true,
      },
      where: {
        identifier,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findVerifiedMetadata(
    identifier: string,
    prisma?: BasePrismaClient,
  ): Promise<VerifiedAssetMetadata | null> {
    const client = prisma ?? this.prisma;
    return client.verifiedAssetMetadata.findUnique({
      where: {
        identifier,
      },
    });
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
        creator: options.creator,
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
    data: AssetWithMetadata[];
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

    const where: Prisma.AssetWhereInput = {};
    if (options.search) {
      where.name = {
        contains: options.search,
      };
    }
    if (options.verified !== undefined) {
      if (options.verified) {
        where.verified_metadata = {
          isNot: null,
        };
      } else {
        where.verified_metadata = {
          is: null,
        };
      }
    }

    const data = await this.prisma.readClient.asset.findMany({
      include: {
        verified_metadata: true,
      },
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

  listMetadata(): Promise<VerifiedAssetMetadata[]> {
    const orderBy = { created_at: SortOrder.ASC };

    return this.prisma.readClient.verifiedAssetMetadata.findMany({
      orderBy,
    });
  }

  async updateNativeAssetSupply(supply: number): Promise<Asset> {
    return this.prisma.asset.update({
      data: {
        supply,
      },
      where: {
        identifier: NATIVE_ASSET_ID,
      },
    });
  }

  async lastUpdate(): Promise<Date | null> {
    const aggregations = await this.prisma.asset.aggregate({
      _max: {
        updated_at: true,
      },
    });

    const metadataDate = await this.lastMetadataUpdate();
    const assetDate = aggregations._max.updated_at;
    return (metadataDate?.valueOf() || 0) > (assetDate?.valueOf() || 0)
      ? metadataDate
      : assetDate;
  }

  async lastMetadataUpdate(): Promise<Date | null> {
    const aggregations = await this.prisma.verifiedAssetMetadata.aggregate({
      _max: {
        updated_at: true,
      },
    });
    return aggregations._max.updated_at;
  }

  async updateVerified(
    options: VerifiedAssetMetadataDto,
  ): Promise<VerifiedAssetMetadata | null> {
    try {
      const record = await this.prisma.verifiedAssetMetadata.upsert({
        create: {
          identifier: options.identifier,
          symbol: options.symbol,
          decimals: options.decimals,
          logo_uri: options.logoURI,
          website: options.website,
        },
        update: {
          symbol: options.symbol,
          decimals: options.decimals,
          logo_uri: options.logoURI,
          website: options.website,
        },
        where: {
          identifier: options.identifier,
        },
      });
      return record;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        return null;
      } else {
        throw e;
      }
    }
  }

  async deleteUnverified(assets: VerifiedAssetMetadataDto[]): Promise<void> {
    await this.prisma.verifiedAssetMetadata.deleteMany({
      where: {
        identifier: {
          notIn: assets.map((asset) => asset.identifier),
        },
      },
    });
  }
}
