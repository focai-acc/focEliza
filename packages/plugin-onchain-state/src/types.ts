export interface Config {
    privateKey: string;
    network?: "mainnet" | "testnet";
}

export interface StateData {
    key: string;
    value: string;
    status: "pending" | "confirmed" | "failed";
    version: number;
    hash?: string;
    created_at: number;
    updated_at: number;
}
