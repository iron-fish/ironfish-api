/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { MultiAsset } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MultiAssetService {
  constructor(private readonly prisma: PrismaService) {}

  async find(id: number): Promise<MultiAsset | null> {
    return this.prisma.readClient.multiAsset.findUnique({
      where: {
        id,
      },
    });
  }

  async findOrThrow(id: number): Promise<MultiAsset> {
    const multiAsset = await this.find(id);

    if (!multiAsset) {
      throw new NotFoundException();
    }

    return multiAsset;
  }
}
