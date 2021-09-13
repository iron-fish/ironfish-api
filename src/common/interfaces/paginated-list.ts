/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { List } from './list';
import { ListMetadata } from './list-metadata';

export interface PaginatedList<T> extends List<T> {
  metadata?: ListMetadata;
}
