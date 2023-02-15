/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { CreateAssetOptions } from './interfaces/create-asset-options';
import { Asset, Transaction } from '.prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(id: number, prisma: BasePrismaClient): Promise<Asset> {
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
        supply: asset.supply + delta,
      },
      where: {
        id: asset.id,
      },
    });
  }
}
