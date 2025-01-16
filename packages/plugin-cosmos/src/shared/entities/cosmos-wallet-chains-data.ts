import { getChainByChainName } from "@chain-registry/utils";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { chains } from "chain-registry";
import { CosmosWallet } from "./cosmos-wallet";
import type {
    ICosmosPluginCustomChainData,
    ICosmosWalletChains,
    ICosmosWalletChainsData,
} from "../interfaces";
import { getAvailableChains } from "../helpers/cosmos-chains";

export class CosmosWalletChains implements ICosmosWalletChains {
    public walletChainsData: ICosmosWalletChainsData = {};

    private constructor(walletChainsData: ICosmosWalletChainsData) {
        this.walletChainsData = walletChainsData;
    }

    public static async create(
        mnemonic: string,
        availableChainNames: string[],
        customChainsData?: ICosmosPluginCustomChainData["chainData"][]
    ) {
        const walletChainsData: ICosmosWalletChainsData = {};
        const availableChains = getAvailableChains(chains, customChainsData);

        for (const chainName of availableChainNames) {
            const chain = getChainByChainName(availableChains, chainName);

            if (!chain) {
                throw new Error(`Chain ${chainName} not found`);
            }

            const wallet = await CosmosWallet.create(
                mnemonic,
                chain.bech32_prefix,
                chain.apis.rpc[0].address
            );

            const chainRpcAddress = chain.apis?.rpc?.[0].address;

            if (!chainRpcAddress) {
                throw new Error(`RPC address not found for chain ${chainName}`);
            }

            const signingCosmWasmClient =
                await SigningCosmWasmClient.connectWithSigner(
                    chain.apis.rpc[0].address,
                    wallet.directSecp256k1HdWallet
                );

            walletChainsData[chainName] = {
                wallet,
                signingCosmWasmClient,
            };
        }

        return new CosmosWalletChains(walletChainsData);
    }

    public async getWalletAddress(chainName: string) {
        return await this.walletChainsData[chainName].wallet.getWalletAddress();
    }

    public getSigningCosmWasmClient(chainName: string) {
        return this.walletChainsData[chainName].signingCosmWasmClient;
    }
}
