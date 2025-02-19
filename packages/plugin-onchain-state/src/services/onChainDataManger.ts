import { Contract, ethers, JsonRpcProvider } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { PinataSDK } from "pinata-web3";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// ON_CHAIN_STATE_NETWORK

// ON_CHAIN_STATE_AGENT_REGISTER

// ON_CHAIN_STATE_RPC

// ONCHAIN_STATE_AGENT_WALLET_SALT

export class _OnChainDataManger {
    private initialized = false;
    private agentIds: string[];
    public rpcProvider;
    private pinata: PinataSDK;
    private agentRegistryContract: Contract;
    private agentContracts: Record<string, Contract> = {};
    private spaceEnvs: Record<string, Record<string,string>> = {};
    private agentEnvs: Record<string, Record<string,string>> = {};

    public async initialize(agentIds: string[]) {
        if (this.initialized) {
            return;
        }

        this.agentIds = agentIds;

        const agentRegisterAbi = fs.readFileSync(
            path.resolve(__dirname, "../src/abi/agent-registry.json"),
            "utf-8"
        );

        this.rpcProvider = new JsonRpcProvider(
            process.env.ON_CHAIN_STATE_RPC
        );

        this.agentRegistryContract = new ethers.Contract(
            process.env.ON_CHAIN_STATE_AGENT_REGISTER,
            agentRegisterAbi,
            this.rpcProvider
        );

        const agentAbi = fs.readFileSync(
            path.resolve(__dirname, "../src/abi/agent.json"),
            "utf-8"
        );

        console.log("agentIds",agentIds);
        for (const agentId of this.agentIds) {
            const agentAdress = await this.agentRegistryContract.getAgent(agentId);
            console.log("agentAdress",agentAdress);
            const contract = new ethers.Contract(
                agentAdress,
                agentAbi,
                this.rpcProvider
            );
            this.agentContracts[agentId] = contract;
        }

        this.initialized = true;
    }

    public async fetchCharacter(): Promise<any> {
        if(!this.pinata) {
            this.pinata = new PinataSDK({
                pinataJwt: process.env.ON_CHAIN_STATE_PINATA_JWT,
                pinataGateway: process.env.ON_CHAIN_STATE_PINATA_GETEWAY,
            });
        }
        const result = [];
        for (const agentId of this.agentIds) {
            const info = await this.agentContracts[agentId].getInfo();
            const uri = info.characterURI as String;
            if(uri && uri.length > 0 && uri.indexOf("ipfs://") >= 0) {
                const cid = uri.substring(7);
                const data = await this.pinata.gateways.get(cid);
                result.push(data.data);
            }
        }
        return result;
    }

    public getAgentContract(agentId: string) {
        return this.agentContracts[agentId];
    }

    public async pullSpaceAllEnvs(space: string): Promise<Record<string,string>> {
        if(!this.spaceEnvs[space]) {
            this.spaceEnvs[space]={}
        }
        const [keys,values] = await this.agentRegistryContract.getAllSpaceEnvs(space);
        console.log("pullSpaceAllEnvs:",space,keys,values);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            this.spaceEnvs[space][key] = values[index];
        }
        return this.spaceEnvs[space];
    }

    public getSpaceEnv(space: string, key: string) {
        return this.spaceEnvs[space][key];
    }

    public async pullAllEnvs(agentId: string): Promise<Record<string,string>> {
        if(!this.agentEnvs[agentId]) {
            this.agentEnvs[agentId]={}
        }
        const contract = this.agentContracts[agentId];
        const [keys,values] = await contract.getAllEnvs();
        console.log("pullAllEnvs:",agentId,keys,values);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            this.agentEnvs[agentId][key] = values[index];
        }
        return this.agentEnvs[agentId];
    }

    public getEnv(agentId: string, key: string) {
        return this.agentEnvs[agentId][key];
    }
}

export const OnChainDataManger = new _OnChainDataManger();