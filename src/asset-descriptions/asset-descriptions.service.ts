/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import {
  Asset,
  AssetDescription,
  AssetDescriptionType,
  Transaction,
} from '@prisma/client';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';

@Injectable()
export class AssetDescriptionsService {
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
}
