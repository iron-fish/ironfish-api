/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
  async attempt(
    @Context() { user }: MagicLinkContext,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    dto: CreateKycDto,
  ): Promise<SerializedKyc> {
    const jumioTransaction = await this.jumioTransactionService.find(user);
    let kycDetails;
    if (jumioTransaction) {
      kycDetails = await this.kycService.status(user, jumioTransaction);
    } else {
      kycDetails = await this.kycService.attempt(user, dto.public_address);
    }
    const redemption = await this.redemptionService.findOrThrow(user);
    return serializeKyc(
      redemption,
      kycDetails.jumio_account_id,
      kycDetails.status,
      kycDetails.jumio_workflow_execution_id,
      kycDetails.jumio_web_href,
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
    const jumioTransaction = await this.jumioTransactionService.find(user);
    if (!jumioTransaction) {
      return null;
    }
    return serializeKyc(
      redemption,
      redemption.jumio_account_id,
      redemption.kyc_status,
      jumioTransaction.workflow_execution_id,
      jumioTransaction.web_href,
    );
  }
}
