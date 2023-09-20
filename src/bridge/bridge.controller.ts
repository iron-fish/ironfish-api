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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BridgeService } from './bridge.service';
import { AddressCreationDTO, IdRetrievalDTO } from './dto';

@ApiTags('Bridge')
@Controller('bridge')
export class BridgeController {
  constructor(private readonly bridgeService: BridgeService) {}

  @ApiOperation({ summary: 'Gets eth addresses by ids' })
  @UseGuards(ApiKeyGuard)
  @Get('retrieve')
  async retrieve(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { ids }: { ids: number[] },
  ): Promise<IdRetrievalDTO> {
    const addresses = await this.bridgeService.findByIds(ids);
    const map: { [key: number]: string | null } = {};
    for (const id of ids) {
      map[id] = addresses.find((r) => r.id === id)?.address ?? null;
    }
    return map;
  }

  @ApiOperation({ summary: 'Gets or creates eth address entries for id' })
  @UseGuards(ApiKeyGuard)
  @Post('create')
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { addresses }: { addresses: string[] },
  ): Promise<AddressCreationDTO> {
    const response: AddressCreationDTO = {};
    const ethAddresses = await this.bridgeService.getOrCreateIds(addresses);
    for (const a of ethAddresses) {
      response[a.address] = a.id;
    }
    return response;
  }
}
