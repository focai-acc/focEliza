import { DeriveKeyProvider, RemoteAttestationQuote } from "@elizaos/plugin-tee";
import { PrivateKeyAccount } from "viem";

export class TeeDeriveKeyProvider {
    private deriveKeyProvider: DeriveKeyProvider;

    constructor(teeMode:string) {
        this.deriveKeyProvider = new DeriveKeyProvider(teeMode);
    }

    async getEcdsaKeypair(
        teeAccountKey: string,
        agentId: string
    ): Promise<{
        keypair: PrivateKeyAccount;
        attestation: RemoteAttestationQuote;
    }> {
        let path = "CHAIN_STATE";
        return this.deriveKeyProvider.deriveEcdsaKeypair(
            path,
            teeAccountKey,
            agentId
        );
    }
}
