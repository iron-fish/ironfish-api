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
  UnprocessableEntityException,
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
    if (await this.redemptionService.find(user)) {
      throw new UnprocessableEntityException('Redemption already exists');
    }
    const redemption = await this.redemptionService.getOrCreate(
      user,
      dto.public_address,
    );
    const kyc = await this.kycService.attempt(user, redemption);

    return serializeKyc(
      redemption,
      kyc.jumio_account_id,
      kyc.jumio_workflow_execution_id,
      kyc.jumio_web_href,
    );
  }

  @ApiExcludeEndpoint()
  @Get()
  @UseGuards(MagicLinkGuard)
  async retrieve(
    @Context() { user }: MagicLinkContext,
  ): Promise<SerializedKyc> {
    const redemption = await this.redemptionService.find(user);
    if (!redemption || !redemption.jumio_account_id) {
      throw new NotFoundException('redemption not found');
    }
    const jumioTransaction =
      await this.jumioTransactionService.getLastestOrThrow(user);
    return serializeKyc(
      redemption,
      redemption.jumio_account_id,
      jumioTransaction.workflow_execution_id,
      jumioTransaction.web_href,
    );
  }
}
