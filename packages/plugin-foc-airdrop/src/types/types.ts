export interface AirdropWallet {
    userId: string | null,
    address: string | null,
}

export interface Airdrop {
    userId: string,
    amount: string,
    wallet: string,
}