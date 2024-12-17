import {
    IVerifiableLogProvider,
    VerifiableAgent,
    VerifiableDAO,
    VerifiableLog,
} from "../types/logTypes.ts";
import {
    DeriveKeyProvider,
    RemoteAttestationProvider,
} from "@ai16z/plugin-tee";

export class VerifiableLogProvider implements IVerifiableLogProvider {
    private dao: VerifiableDAO;
    private keyPath: string = "/keys/verifiable_key";

    constructor(dao: VerifiableDAO) {
        this.dao = dao;
    }

    async log(
        params: {
            agentId: string;
            roomId: string;
            userId: string;
            type: string;
            content: string;
        },
        endpoint: string
    ): Promise<boolean> {
        let singed: string = "";

        const provider = new DeriveKeyProvider(endpoint);

        try {
            const evmKeypair = await provider.deriveEcdsaKeypair(
                this.keyPath,
                params.agentId
            );

            const signature = await evmKeypair.signMessage({
                message: params.content,
            });
            singed = signature.toString();

            // evmKeypair can now be used for Ethereum operations
        } catch (error) {
            console.error("EVM key derivation failed:", error);
        }
        return this.dao.addLog(<VerifiableLog>{
            agent_id: params.agentId,
            room_id: params.roomId,
            user_id: params.userId,
            type: params.type,
            content: params.content,
            signature: singed,
        });
    }

    async registerAgent(
        params: {
            agentId: string;
        },
        endpoint: string
    ): Promise<boolean> {
        if (params.agentId === undefined) {
            throw new Error("agentId is required");
        }

        const agent = await this.dao.getAgent(params.agentId);
        if (agent !==null){
            return true;
        }
        const provider = new DeriveKeyProvider(endpoint);
        const evmKeypair = await provider.deriveEcdsaKeypair(
            this.keyPath,
            params.agentId
        );
        const publicKey = evmKeypair.publicKey;

        return this.dao.addAgent(<VerifiableAgent>{
            agent_id: params.agentId,
            tee_key: this.keyPath,
            public_key: publicKey,
        });
    }

    async generateAttestation(
        params: {
            agentId: string;
            publicKey: string;
        },
        endpoint: string
    ): Promise<string> {
        if (params.agentId === undefined || params.publicKey === undefined) {
            throw new Error("agentId and publicKey are required");
        }
        const raProvider = new RemoteAttestationProvider(endpoint);
        try {
            // 生成 32 字节的报告数据 (reportData)，包含公钥的哈希值
            const reportData = JSON.stringify(params);
            // 调用远程证明接口
            return raProvider.generateAttestation(reportData);
        } catch (error) {
            console.error("Failed to generate attestation quote:", error);
            throw error;
        }
    }
}
