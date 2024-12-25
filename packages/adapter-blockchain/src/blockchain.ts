import {
    Character,
    Memory,
 } from "@ai16z/eliza";
 import { IBlockchain } from "./types";
 import Web3 from 'web3';

 export class BaseStoreAdapter implements IBlockchain {
    private account;

    constructor() {
        const url = process.env.BLOCKSTORE_REGISTRY_URL;
        const privKey = process.env.BLOCKSTORE_PRIVATEKEY;

        if (!url || !privKey) {
            throw new Error("Base chain configuration is incorrect");
        }

        const web3 = new Web3(url);
        const key: string = privKey || "";
        const account = web3.eth.accounts.privateKeyToAccount(key);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        this.account = account;
    }

    async pull<T>(idx: string): Promise<T> {
      return Promise.reject(new Error("Method 'pull' is not implemented yet."));
    }

    async push<T>(blob: T): Promise<string> {
      // if (blob instanceof Memory)
      return Promise.reject(new Error("Method 'push' is not implemented yet."));
    }
  }

export class EVMStoreAdapter implements IBlockchain {
  constructor() {
    // get url from character
    // get private key from env
  }

  async pull<T>(idx: string): Promise<T> {
    return Promise.reject(new Error("Method 'pull' is not implemented yet."));
  }

  async push<T>(blob: T): Promise<string> {
    // if (blob instanceof Memory)
    return Promise.reject(new Error("Method 'push' is not implemented yet."));
  }
}

export class CelestiaStoreAdapter implements IBlockchain {
    constructor() {
      // get url from character
      // get private key from env
    }

    async pull<T>(idx: string): Promise<T> {
        return Promise.reject(new Error("Method 'pull' is not implemented yet."));
    }

    async push<T>(blob: T): Promise<string> {
        return Promise.reject(new Error("Method 'push' is not implemented yet."));
    }
}

export function createBlockchain(
    chain: string|undefined,
  ): IBlockchain {
    switch (chain) {
      case "evm":
        return new EVMStoreAdapter();
      case "celestia":
        return new CelestiaStoreAdapter();
      case "base":
        return new BaseStoreAdapter();
      default:
        throw new Error(`Unknown store key: ${chain}`);
    }
}
