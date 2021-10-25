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
