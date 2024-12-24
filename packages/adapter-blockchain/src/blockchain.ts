import {
    Character,
    Memory,
 } from "@ai16z/eliza";
 import { IBlockchain } from "./types";

 export class BaseStoreAdapter implements IBlockchain {
    constructor() {
      // get url from character
      // get private key from env
    }

    async pull<T>(idx: string): Promise<T> {
      return Promise.reject(new Error("Method 'pull' is not implemented yet."));
    }

    async push<T>(blob: T): Promise<string> {
      // if (blob instanceof Memory)
      return Promise.reject(new Error("Method 'pull' is not implemented yet."));
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
    return Promise.reject(new Error("Method 'pull' is not implemented yet."));
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
        return Promise.reject(new Error("Method 'pull' is not implemented yet."));
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
