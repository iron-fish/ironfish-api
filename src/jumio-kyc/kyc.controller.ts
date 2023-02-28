/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { KycService } from '../jumio-kyc/kyc.service';
import { JumioCallbackDto } from './dto/jumio-callback.dto';

// For more information about the jumio callback, see this
// https://github.com/Jumio/implementation-guides/blob/master/api-guide/api_guide.md#callback-parameters

@ApiTags('Callback')
@Controller('jumio/callback')
export class CallbackController {
  constructor(private readonly kycService: KycService) {}

  @ApiExcludeEndpoint()
  @Post()
  async callback(
    @Res() res: Response,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    dto: JumioCallbackDto,
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(dto);
    await Promise.resolve(dto);

    // Jumio requires a 200 explicitly
    res.status(HttpStatus.CREATED).send();
  }
}
