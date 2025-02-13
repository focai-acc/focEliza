import { IAgentRuntime } from '@elizaos/core';
import { Account, transfer, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import bs58 from "bs58";

export class SPLTransfer {
    private connection: Connection;
    private sender: Keypair;
    private mint: PublicKey;

    constructor(runtime: IAgentRuntime) {
        this.connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

        const privKey = runtime.getSetting("AIRDROP_SENDER_KEY");
        const secretKey = bs58.decode(privKey);
        this.sender = Keypair.fromSecretKey(secretKey);

        const tokenAddress = runtime.getSetting("AIRDROP_TOKEN_ADDRESS");
        this.mint = new PublicKey(tokenAddress);
    }

    // transfer splTokens and return the signature
    async transfer(toAddress: string, amount: number): Promise<string> {
        const recipientPublicKey = new PublicKey(toAddress);

        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            this.connection,
            this.sender,
            this.mint,
            this.sender.publicKey
        );

        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            this.connection,
            this.sender,
            this.mint,
            recipientPublicKey
        );

        const signature = await transfer(
            this.connection,
            this.sender,
            fromTokenAccount.address,
            toTokenAccount.address,
            this.sender.publicKey,
            BigInt(amount)
        );

        return signature;
    }
}
