import Web3 from 'web3';
import { RegistryABI } from './contract';
import { elizaLogger } from '@ai16z/eliza';

export class Registry {
    private web3;
    private contract;
    private account;

    constructor() {
        const contractAddress = process.env.BLOCKSTORE_REGISTRY_ADDR;
        const url = process.env.BLOCKSTORE_REGISTRY_URL;
        const privKey = process.env.BLOCKSTORE_PRIVATEKEY;

        if (!contractAddress || !url || !privKey) {
            throw new Error("blockstore configure is not correct");
        }

        const web3 = new Web3(url);
        const key: string = privKey || "";
        const account = web3.eth.accounts.privateKeyToAccount(key);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        this.account = account;
        this.web3 = web3;

        this.contract = new web3.eth.Contract(RegistryABI, contractAddress);
    }

    /**
   * Get the hash for a given key from the contract.
   * @param key The key to query.
   * @returns The associated hash as a `bytes32`.
   */
    async getHash(key: string): Promise<string> {
        try {
            const hash = await this.contract.methods.getHash(key).call();
            return hash;
        } catch (error) {
            elizaLogger.error("Error during getHash:", error);
            return "";
        }
    }

  /**
   * Register or update a key-value pair in the contract.
   * @param key The key to register or update.
   * @param hash The hash value to associate with the key.
   * @param from The sender's address.
   */
  async registerOrUpdate(key: string, hash: string): Promise<boolean> {
    try {
        const tx = await this.contract.methods.registerOrUpdate(key, hash).send({ from: this.account.address });
        return true;
    } catch (error) {
        elizaLogger.error("Error during registerOrUpdate", error);
        return false;
    }
  }
}