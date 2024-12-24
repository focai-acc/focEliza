import {
    IBlockStoreAdapter,
    Character,
    Memory,
 } from "@ai16z/eliza";

 export class BaseStoreAdapter implements IBlockStoreAdapter {
    constructor(character: Character, privateKey: string) {
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

export class EVMStoreAdapter implements IBlockStoreAdapter {
  constructor(character: Character, privateKey: string) {
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

export class CelestiaStoreAdapter implements IBlockStoreAdapter {
    constructor(character: Character, privateKey: string) {
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

export function createBlockStoreAdapter(
    character: Character,
    privateKey: string
  ): IBlockStoreAdapter {
    let key = "evm"; // DEFAULT to evm
    // read key from character.blockStore

    switch (key) {
      case "evm":
        return new EVMStoreAdapter(character, privateKey);
      case "celestia":
        return new CelestiaStoreAdapter(character, privateKey);
      case "base":
        return new BaseStoreAdapter(character, privateKey);
      default:
        throw new Error(`Unknown store key: ${key}`);
    }
}
