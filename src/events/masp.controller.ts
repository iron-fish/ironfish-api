/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Post,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMaspTransactionsDto } from './dto/upsert-masp.dto';
import { MaspTransactionsUpsertService } from './masp.upsert.service';
@ApiTags('Masp')
@Controller('masp')
export class MaspController {
  constructor(
    private readonly maspTransactionUpsertService: MaspTransactionsUpsertService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Gets the head of the chain' })
  @ApiExcludeEndpoint()
  @Get('head')
  async head(): Promise<{ block_hash: string }> {
    const maspTransactionhead = await this.prisma.maspTransactionHead.findFirst(
      { where: { id: 1 } },
    );

    if (!maspTransactionhead) {
      throw new NotFoundException();
    }

    return {
      block_hash: maspTransactionhead.block_hash,
    };
  }

  @ApiExcludeEndpoint()
  @Post()
  @UseGuards(ApiKeyGuard)
  async bulkUpsert(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    data: UpsertMaspTransactionsDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.maspTransactionUpsertService.bulkUpsert(data.operations);
    res.sendStatus(HttpStatus.ACCEPTED);
  }
}
