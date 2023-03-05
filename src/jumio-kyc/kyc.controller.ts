/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { CreateKycDto } from './dto/create-kyc.dto';
import { JumioCallbackData } from './interfaces/jumio-callback-data';
import { RefreshUserRedemptionOptions } from './interfaces/refresh-user-redemption-options';
import { SerializedKyc } from './interfaces/serialized-kyc';
import { SerializedKycConfig } from './interfaces/serialized-kyc-config';
import { KycService } from './kyc.service';
import { serializeKyc } from './utils/serialize-kyc';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(
    private readonly redemptionService: RedemptionService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly kycService: KycService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly config: ApiConfigService,
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

    const { eligible, reason: eligibleReason } =
      await this.redemptionService.isEligible(user, redemption);

    const { attemptable, reason: attemptableReason } =
      await this.redemptionService.canAttempt(redemption, user);

    return serializeKyc(
      redemption,
      transaction,
      eligible,
      eligibleReason,
      attemptable,
      attemptableReason,
      this.config,
    );
  }

  @ApiExcludeEndpoint()
  @Get()
  @UseGuards(MagicLinkGuard)
  async status(
    @Context() { user }: MagicLinkContext,
  ): Promise<
    | SerializedKyc
    | Pick<
        SerializedKyc,
        | 'can_attempt'
        | 'can_attempt_reason'
        | 'can_create'
        | 'can_create_reason'
      >
  > {
    const redemption = await this.redemptionService.find(user);

    const { eligible, reason: eligibleReason } =
      await this.redemptionService.isEligible(user, redemption);

    const { attemptable, reason: attemptableReason } =
      await this.redemptionService.canAttempt(redemption, user);

    if (!redemption) {
      return {
        can_attempt: eligible,
        can_attempt_reason: eligibleReason,
        can_create: attemptable,
        can_create_reason: attemptableReason,
      };
    }

    const jumioTransaction =
      await this.jumioTransactionService.findLatestOrThrow(user);

    return serializeKyc(
      redemption,
      jumioTransaction,
      eligible,
      eligibleReason,
      attemptable,
      attemptableReason,
      this.config,
    );
  }

  @ApiExcludeEndpoint()
  @Get('config')
  getConfig(): SerializedKycConfig {
    return {
      data: [
        {
          airdrop_completed_by: new Date(Date.UTC(2023, 2, 16, 0, 0, 0)),
          coins: 105000,
          kyc_completed_by: new Date(Date.UTC(2023, 2, 13, 0, 0, 0)),
          name: 'pool_three',
          pool_name: 'Code Contributions Pool',
        },
        {
          airdrop_completed_by: new Date(Date.UTC(2023, 2, 23, 0, 0, 0)),
          coins: 420000,
          kyc_completed_by: new Date(Date.UTC(2023, 2, 19, 0, 0, 0)),
          name: 'pool_one',
          pool_name: 'Phase 1 Pool',
        },
        {
          airdrop_completed_by: new Date(Date.UTC(2023, 2, 30, 0, 0, 0)),
          coins: 210000,
          kyc_completed_by: new Date(Date.UTC(2023, 2, 26, 0, 0, 0)),
          name: 'pool_two',
          pool_name: 'Phase 2 Pool',
        },
        {
          airdrop_completed_by: new Date(Date.UTC(2023, 3, 6, 0, 0, 0)),
          coins: 210000,
          kyc_completed_by: new Date(Date.UTC(2023, 2, 26, 0, 0, 0)),
          name: 'pool_four',
          pool_name: 'Phase 3 Pool',
        },
      ],
    };
  }
  /**
   * For more information about the jumio callback, see this
   * https://github.com/Jumio/implementation-guides/blob/master/api-guide/api_guide.md#callback-parameters
   */
  @ApiExcludeEndpoint()
  @Post('/callback')
  async callback(
    @Res() res: Response,
    @Body()
    dto: JumioCallbackData,
  ): Promise<void> {
    await this.kycService.handleCallback(dto);

    // Jumio requires a 200 explicitly
    res.status(HttpStatus.OK).send();
  }

  @ApiExcludeEndpoint()
  @UseGuards(ApiKeyGuard)
  @Post('refresh')
  async refresh(): Promise<void> {
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.REFRESH_USERS_REDEMPTION,
    );
  }

  @ApiExcludeEndpoint()
  @UseGuards(ApiKeyGuard)
  @Post('refresh/:user_id')
  async refreshUser(
    @Param('user_id', new IntIsSafeForPrismaPipe())
    user_id: number,
  ): Promise<void> {
    await this.graphileWorkerService.addJob<RefreshUserRedemptionOptions>(
      GraphileWorkerPattern.REFRESH_USER_REDEMPTION,
      { userId: user_id },
    );
  }

  @ApiExcludeEndpoint()
  @Post('/complete')
  @UseGuards(MagicLinkGuard)
  async markComplete(@Context() { user }: MagicLinkContext): Promise<void> {
    await this.kycService.markComplete(user);
  }
}
