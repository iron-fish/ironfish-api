/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { SerializedBlock } from '../../blocks/interfaces/serialized-block';
import { SerializedTransaction } from './serialized-transaction';

export interface SerializedTransactionWithBlocks extends SerializedTransaction {
  blocks: SerializedBlock[];
}
