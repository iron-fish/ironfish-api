/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { SerializedRedemption } from './interfaces/serializedRedemption';
import { RedemptionService } from './redemption.service';
import { serializeRedemption } from './utils/serialize-redemption';

@ApiTags('Redemption')
@Controller('redemption')
export class RedemptionsController {
  constructor(private readonly redemptionService: RedemptionService) {}

  matchUserOrThrow(id: number, user: User): void {
    if (id !== user.id) {
      throw new ForbiddenException('User id does not match magic link user');
    }
  }

  @ApiExcludeEndpoint()
  @Post(':id')
  @UseGuards(MagicLinkGuard)
  async create(
    @Context() { user }: MagicLinkContext,
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    dto: CreateRedemptionDto,
  ): Promise<SerializedRedemption> {
    this.matchUserOrThrow(id, user);
    if (await this.redemptionService.find(user)) {
      throw new UnprocessableEntityException('Redemption already exists');
    }
    const redemption = await this.redemptionService.create(
      user,
      dto.public_address,
    );
    return serializeRedemption(redemption);
  }

  @ApiExcludeEndpoint()
  @Get(':id')
  @UseGuards(MagicLinkGuard)
  async retrieve(
    @Context() { user }: MagicLinkContext,
  ): Promise<SerializedRedemption> {
    const redemption = await this.redemptionService.find(user);
    if (!redemption) {
      throw new NotFoundException('redemption not found');
    }
    return serializeRedemption(redemption);
  }
}
