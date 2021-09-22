import { BlockOperation } from '../enums/block-operation';

export interface UpsertBlockOptions {
  hash: string;
  sequence: number;
  difficulty: number;
  type: BlockOperation;
  timestamp: Date;
  transactionsCount: number;
  graffiti: string;
  previous_block_hash?: string;
  size?: number;
}
