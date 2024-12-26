import Web3 from 'web3';
import { RegistryABI } from './contract';
import { elizaLogger } from '@ai16z/eliza';

export class Registry {
    private contract;
    private account;

    constructor() {
        const contractAddress = process.env.BLOCKSTORE_REGISTRY_ADDR;
        const url = process.env.BLOCKSTORE_REGISTRY_URL;
        const privKey = process.env.BLOCKSTORE_REGISTRY_PRIVATEKEY;

        if (!contractAddress || !url || !privKey) {
            throw new Error("Block store registry configuration is incorrect.");
        }

        const web3 = new Web3(url);
        const key: string = privKey || "";
        const account = web3.eth.accounts.privateKeyToAccount(key);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        this.account = account;

        this.contract = new web3.eth.Contract(RegistryABI, contractAddress);
    }

    /**
   * Get the value for a given key from the contract.
   * @param id The key to query.
   * @returns The associated value of the key.
   */
    async getValue(id: string): Promise<string> {
        if (id == "") {
            return ""
        }

        try {
            const idx = await this.contract.methods.getValue(id).call();
            return idx;
        } catch (error) {
            elizaLogger.error("Error during getValue:", error);
            return "";
        }
    }

  /**
   * Register or update a key-value pair in the contract.
   * @param id The key to register or update.
   * @param idx The value to associate with the key.
   * @param from The sender's address.
   */
  async registerOrUpdate(id: string, idx: string): Promise<boolean> {
    if (id == "") {
        elizaLogger.error("Error during registerOrUpdate, id is empty");
        return false
    }

    try {
        const tx = await this.contract.methods.registerOrUpdate(id, idx).send({ from: this.account.address });
        return true;
    } catch (error) {
        elizaLogger.error("Error during registerOrUpdate", error);
        return false;
    }
  }
}