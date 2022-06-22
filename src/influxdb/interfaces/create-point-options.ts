/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Field } from './field';
import { Tag } from './tag';

export interface CreatePointOptions {
  fields: Field[];
  measurement: string;
  tags: Tag[];
  timestamp: number;
}
