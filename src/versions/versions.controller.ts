/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Version } from '@prisma/client';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CreateVersionDto } from './dto/create-version.dto';
import { VersionsService } from './versions.service';

@ApiTags('Version')
@Controller('version')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @ApiOperation({ summary: 'Gets the version of the Iron Fish package' })
  @Get()
  async version(): Promise<string> {
    const latestVersion = await this.versionsService.getLatest();
    return latestVersion ? latestVersion.version : '';
  }

  @ApiExcludeEndpoint()
  @UseGuards(ApiKeyGuard)
  @UsePipes(
    new ValidationPipe({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      transform: true,
    }),
  )
  @Post()
  async updateVersion(
    @Query()
    { version }: CreateVersionDto,
  ): Promise<Version> {
    return this.versionsService.create(version);
  }
}
