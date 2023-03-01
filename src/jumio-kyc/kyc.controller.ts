/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { CreateKycDto } from './dto/create-kyc.dto';
import { SerializedKyc } from './interfaces/serialized-kyc';
import { KycService } from './kyc.service';
import { serializeKyc } from './utils/serialize-kyc';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(
    private readonly redemptionService: RedemptionService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly kycService: KycService,
  ) {}

  @ApiExcludeEndpoint()
  @Post()
  @UseGuards(MagicLinkGuard)
  async create(
    @Context() { user }: MagicLinkContext,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    dto: CreateKycDto,
  ): Promise<SerializedKyc> {
    const { redemption, transaction } = await this.kycService.attempt(
      user,
      dto.public_address,
    );
    if (!redemption.jumio_account_id) {
      throw new InternalServerErrorException(
        'should have account id after attempt',
      );
    }

    return serializeKyc(
      redemption,
      redemption.jumio_account_id,
      redemption.kyc_status,
      transaction.web_href,
      transaction.workflow_execution_id,
    );
  }

  @ApiExcludeEndpoint()
  @Get()
  @UseGuards(MagicLinkGuard)
  async status(
    @Context() { user }: MagicLinkContext,
  ): Promise<SerializedKyc | null> {
    const redemption = await this.redemptionService.find(user);
    if (!redemption || !redemption.jumio_account_id) {
      return null;
    }
    const jumioTransaction =
      await this.jumioTransactionService.findLatestOrThrow(user);
    return serializeKyc(
      redemption,
      redemption.jumio_account_id,
      redemption.kyc_status,
      jumioTransaction.web_href,
      jumioTransaction.workflow_execution_id,
    );
  }
}
