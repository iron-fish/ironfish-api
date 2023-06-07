/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlocksService } from '../blocks/blocks.service';

@ApiTags('Supply')
@Controller('supply')
export class SupplyController {
  constructor(private readonly blocksService: BlocksService) {}

  @ApiOperation({ summary: 'Gets the circulating supply of the chain' })
  @Get('circulating')
  async circulating(): Promise<number> {
    const head = await this.blocksService.head();
    const { circulating } = this.blocksService.totalAndCirculatingSupplies(
      head.sequence,
    );
    return circulating;
  }

  @ApiOperation({ summary: 'Gets the total supply of the chain' })
  @Get('total')
  async total(): Promise<number> {
    const head = await this.blocksService.head();
    const { total } = this.blocksService.totalAndCirculatingSupplies(
      head.sequence,
    );
    return total;
  }
}
