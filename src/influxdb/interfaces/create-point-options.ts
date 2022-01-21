/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Tag } from './tag';

export interface CreatePointOptions {
  measurement: string;
  name: string;
  tags: Tag[];
  timestamp: Date;
  value: number;
}
