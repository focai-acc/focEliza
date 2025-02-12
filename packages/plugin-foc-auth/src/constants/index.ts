import { IAgentRuntime } from "@elizaos/core";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import * as crypto from "crypto";

export const focAuthNamespace = "foc_auth";
export const userInfoPrefix = "userInfo_";

const bizMod = "focAuth";

export async function FocAuthKey(runtime: IAgentRuntime): Promise<string> {
    const authKey = runtime.getSetting("FOC_AUTH_KEY");
    if (authKey) {
        // key is set, use the key
        return authKey;
    }

    const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;
    const keyProvider = new DeriveKeyProvider(teeMode);
    const keyPath = `/${runtime.agentId}/tee/keypair/${bizMod}`;
        const seed = await this.provider.rawDeriveKey(keyPath, runtime.agentId);
        const privateKey = crypto.createPrivateKey({
            key: seed.key,
            format: "pem",
        });
        const privateKeyDer = privateKey.export({
            format: "der",
            type: "pkcs8",
        });

    return privateKeyDer.slice(-32).toString("hex");
}