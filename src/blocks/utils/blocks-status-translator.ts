/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BlocksStatus } from '../interfaces/blocks-status';
import { SerializedBlocksStatus } from '../interfaces/serialized-blocks-status';

export function serializedBlocksStatusFromRecord(
  blocksStatus: BlocksStatus,
): SerializedBlocksStatus {
  return {
    object: 'blocks_status',
    chain_height: blocksStatus.chainHeight,
    percentage_marked: blocksStatus.percentageMarked,
    unique_graffiti: blocksStatus.uniqueGraffiti,
  };
}
