export interface UpsertTransactionOptions {
    hash: string;
    fee: BigInt;
    size: number;
    notes: Note[];
    spends: Spend[];
}

interface Note {
    commitment: string;
}

interface Spend {
    nullifier: string;
}