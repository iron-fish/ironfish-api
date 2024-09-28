/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsDefined, IsInt, IsPositive, IsString } from 'class-validator';
import { stringToPositiveBigint } from '../../common/utils/bigint';

export class TransactionsCreateDto {
  @ApiProperty({ description: 'Bridged amount in ORE', type: 'number' })
  @Transform(({ key, value }: TransformFnParams) =>
    stringToPositiveBigint(key, value),
  )
  @IsDefined({
    message: 'Bridged amount required to create transaction',
  })
  readonly amount!: bigint;

  @ApiProperty({
    description: 'Asset identifier of the Iron Fish asset to be bridged',
  })
  @IsDefined({
    message: 'Iron Fish asset identifier required to create transaction',
  })
  @IsString()
  readonly asset_id!: string;

  @ApiProperty({
    description: 'ID of the destination network',
  })
  @IsDefined({
    message: 'Destination network ID required to create transaction',
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly target_network_id!: number;

  @ApiProperty({
    description:
      'Address on the destination network that will receive the bridged asset',
  })
  @IsDefined({
    message: 'Destination network address required to create transaction',
  })
  @IsString()
  readonly target_address!: string;
}
