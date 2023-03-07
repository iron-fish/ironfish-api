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
  Put,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { AIRDROP_CONFIG } from '../common/constants';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { fetchIpAddressFromRequest } from '../common/utils/request';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { UsersService } from '../users/users.service';
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
    private readonly usersService: UsersService,
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
    @Req()
    req: Request,
  ): Promise<SerializedKyc> {
    const { redemption, transaction } = await this.kycService.attempt(
      user,
      dto.public_address,
      fetchIpAddressFromRequest(req),
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
  @Put()
  @UseGuards(MagicLinkGuard)
  async updateAddress(
    @Context() { user }: MagicLinkContext,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    dto: CreateKycDto,
    @Res()
    res: Response,
  ): Promise<void> {
    const redemption = await this.redemptionService.findOrThrow(user);

    await this.redemptionService.update(redemption, {
      publicAddress: dto.public_address,
    });
    res.status(HttpStatus.OK).send();
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
    return AIRDROP_CONFIG;
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

  @ApiExcludeEndpoint()
  @Get('/sanctions/:id')
  @UseGuards(ApiKeyGuard)
  async sanctionScreening(
    @Res() res: Response,
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
  ): Promise<void> {
    await this.kycService.standaloneWatchlist(id);
  }

  @Get('/allocations')
  @UseGuards(ApiKeyGuard)
  async allocations(@Res() res: Response): Promise<void> {
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.ALLOCATION_CREATION,
    );

    // Jumio requires a 200 explicitly
    res.status(HttpStatus.OK).send();
  }
}
