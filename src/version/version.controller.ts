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
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { VersionDto } from './dto/version.dto';
import { VersionService } from './version.service';

@ApiTags('Version')
@Controller('version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @ApiOperation({ summary: 'Gets the version of the Iron Fish API' })
  @Get()
  async version(): Promise<string> {
    const latestVersion = await this.versionService.getLatest();
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
    { version }: VersionDto,
  ): Promise<string> {
    const newVersion = await this.versionService.create(version);
    return newVersion.version;
  }
}
