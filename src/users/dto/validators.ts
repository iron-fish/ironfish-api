/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { EventType } from '@prisma/client';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isInStrEnum } from '../../common/utils/enums';

@ValidatorConstraint()
export class IsEventTypesArray implements ValidatorConstraintInterface {
  validate(data: unknown): boolean {
    return Array.isArray(data) && data.every((v) => isInStrEnum(v, EventType));
  }

  defaultMessage(): string {
    return 'Value was not an array of EventType enum values';
  }
}
