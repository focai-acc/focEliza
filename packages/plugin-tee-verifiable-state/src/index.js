import { TEEMode } from "@elizaos/plugin-tee";
import { TeeType } from "./types";
import { SgxAttestationProvider } from "@elizaos/plugin-sgx";
import elliptic from "elliptic";
export class VerifiableState {
    constructor() {
        this.handlers = {};
        this.teeConfig = {
            enabled: false,
            teeMode: TEEMode.OFF,
        };
        this.keyPairs = new Map();
        this.ec = new elliptic.ec("secp256k1");
        this.verifications = [];
        this.initialized = false;
    }
    static getInstance() {
        if (!this._instance) {
            this._instance = new VerifiableState();
        }
        return this._instance;
    }
    async initialize(runtime) {
        if (this.initialized)
            return;
        this.initialized = true;
        this.runtime = runtime;
        // 检查是否启用 TEE
        const enableTeeLog = runtime.getSetting("ENABLE_TEE_STATE");
        if (!enableTeeLog) {
            console.log("TEE state verification is not enabled.");
            return;
        }
        const enableValues = ["true", "1", "yes", "enable", "enabled", "on"];
        this.teeConfig.enabled = enableValues.includes(enableTeeLog.toLowerCase());
        // 检查 TEE 类型
        const runInSgx = runtime.getSetting("SGX");
        const useSgxGramine = runInSgx && enableValues.includes(runInSgx.toLowerCase());
        if (useSgxGramine) {
            this.teeConfig.teeType = TeeType.SGX_GRAMINE;
            // 检查是否为模拟模式
            const teeMode = runtime.getSetting("TEE_MODE");
            this.teeConfig.simulation = teeMode === "simulation";
            // 如果不是模拟模式，检查 SGX 环境
            if (!this.teeConfig.simulation) {
                const { checkSGXEnvironment } = await import("./utils/sgxUtils");
                if (!checkSGXEnvironment()) {
                    throw new Error(`SGX environment not available.\n` +
                        `Required files in /dev/attestation/ not found.\n` +
                        `If running in simulation mode, set TEE_MODE=simulation`);
                }
            }
        }
        else if (this.teeConfig.enabled) {
            throw new Error("Only SGX_GRAMINE is supported when TEE is enabled");
        }
        // 如果启用了 TEE 但没有指定类型，抛出错误
        if (this.teeConfig.enabled && !this.teeConfig.teeType) {
            throw new Error("TEE is enabled but no valid TEE type is configured.");
        }
        // 生成密钥对
        if (this.teeConfig.enabled && runtime.agentId) {
            const keyPair = this.ec.genKeyPair();
            this.keyPairs.set(runtime.agentId, keyPair);
            // 生成认证
            const publicKey = keyPair.getPublic().encode("hex", true);
            await this.generateAttestation(publicKey);
        }
    }
    registerState(stateName, handler) {
        if (this.handlers[stateName]) {
            throw new Error(`State handler for ${stateName} already exists`);
        }
        this.handlers[stateName] = handler;
    }
    async getState(stateName, key) {
        const handler = this.handlers[stateName];
        if (!handler) {
            throw new Error(`No handler registered for state: ${stateName}`);
        }
        try {
            const value = await handler(key);
            const metadata = {
                stateName,
                key,
                value,
                timestamp: Date.now(),
            };
            // 如果启用了 TEE，添加签名
            if (this.teeConfig.enabled && this.runtime) {
                metadata.signature = await this.signData(metadata);
            }
            return metadata;
        }
        catch (error) {
            throw new Error(`Error getting state ${stateName}.${key}: ${error}`);
        }
    }
    async verifyState(stateName, key, expectedValue) {
        try {
            const stateMetadata = await this.getState(stateName, key);
            const actualValue = stateMetadata.value;
            const verification = {
                stateName,
                key,
                expectedValue,
                actualValue,
                verified: JSON.stringify(actualValue) ===
                    JSON.stringify(expectedValue),
                timestamp: Date.now(),
            };
            // 如果启用了 TEE，添加签名
            if (this.teeConfig.enabled && this.runtime) {
                verification.signature = await this.signData(verification);
            }
            return verification;
        }
        catch (error) {
            throw new Error(`Error verifying state ${stateName}.${key}: ${error}`);
        }
    }
    async generateAttestation(data) {
        const dataStr = JSON.stringify(data);
        if (this.teeConfig.teeType === TeeType.SGX_GRAMINE) {
            if (this.teeConfig.simulation) {
                // 模拟模式下生成模拟认证
                const simulatedAttestation = {
                    report: Buffer.from(`simulated_report_${dataStr}`).toString("base64"),
                    signature: Buffer.from(`simulated_signature_${Date.now()}`).toString("base64"),
                    certificateChain: ["simulated_cert_1", "simulated_cert_2"],
                };
                return JSON.stringify(simulatedAttestation);
            }
            else {
                // 真实 SGX 环境
                const provider = new SgxAttestationProvider();
                const attestation = await provider.generateAttestation(dataStr);
                return JSON.stringify(attestation);
            }
        }
        throw new Error("Only SGX_GRAMINE is supported");
    }
    async signData(data) {
        if (!this.runtime?.agentId) {
            throw new Error("Agent ID not found");
        }
        const keyPair = this.keyPairs.get(this.runtime.agentId);
        if (!keyPair) {
            throw new Error("Key pair not found for agent");
        }
        const dataStr = JSON.stringify(data);
        const signature = keyPair.sign(dataStr);
        return "0x" + signature.toDER("hex");
    }
    logVerification(result) {
        this.verifications.push(result);
    }
    queryVerifications(filters) {
        return this.verifications.filter((entry) => {
            // 过滤逻辑
        });
    }
    shutdown() {
        this.keyPairs.clear();
        this.handlers = {};
    }
}
