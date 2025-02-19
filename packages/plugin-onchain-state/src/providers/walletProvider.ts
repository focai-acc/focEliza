import {
    type IAgentRuntime,
    elizaLogger,
} from "@elizaos/core";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";

// export const initWalletProvider = async (runtime: IAgentRuntime) => {
//     const teeMode = runtime.getSetting("TEE_MODE");
//     if (teeMode === TEEMode.OFF) {
//         return;
//     }
//     const deriveKeyProvider = new DeriveKeyProvider(teeMode);
//     try {
//         const walletSecretSalt = runtime.getSetting("WALLET_SECRET_SALT");
//         if (!walletSecretSalt) {
//             throw new Error(
//                 "WALLET_SECRET_SALT required when TEE_MODE is enabled"
//             );
//         }

//         const derivedKeyPair = await deriveKeyProvider.deriveEcdsaKeypair(
//             "/",
//             walletSecretSalt,
//             runtime.agentId
//         );
//         return derivedKeyPair.keypair;
//     } catch (error) {
//         elizaLogger.error("Error in wallet provider:", error.message);
//         return `Failed to fetch wallet information: ${error instanceof Error ? error.message : "Unknown error"}`;
//     }
// };
