import {
    Character,
    Memory,
    elizaLogger,
 } from "@ai16z/eliza";
 import { IBlockchain, Message } from "./types";
 import Web3 from 'web3';

 export class BaseStoreAdapter implements IBlockchain {
    private account;
    private web3;

    constructor() {
        const url = process.env.BLOCKSTORE_REGISTRY_URL;
        const privKey = process.env.BLOCKSTORE_PRIVATEKEY;

        if (!url || !privKey) {
            throw new Error("Base chain configuration is incorrect");
        }

        const web3 = new Web3(url);
        const key: string = privKey || "";
        const account = web3.eth.accounts.privateKeyToAccount(key);
        this.account = account;
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        this.web3= web3;
    }

    async pull<T>(idx: string): Promise<T> {
        if (!this.web3.utils.isHexStrict(idx)) {
            throw new Error("Invalid transaction hash format");
        }

        const transaction = await this.web3.eth.getTransaction(idx);
        if (!transaction) {
            throw new Error(`Get transaction of ${idx} failed`);
        }

        const blobData = transaction.input;
        if (!blobData || blobData === "0x") {
            throw new Error(`Transaction of ${idx} has no data`);
        }

        return blobData;
    }

    async push<T>(blob: T): Promise<string> {
        const strData = String(blob);
        const hexData = Buffer.from(strData, 'utf8').toString('hex');

        try {
            let tx = {
                from: this.account.address,
                to: this.account.address,
                value: this.web3.utils.toWei('0', 'ether'),
                data: '0x' + hexData,
                gas: 0,
                gasPrice: await this.web3.eth.getGasPrice(),
                nonce: await this.web3.eth.getTransactionCount(this.account.address),
            };
            const estimatedGas = await this.web3.eth.estimateGas(tx);
            tx.gas = estimatedGas;

            const signedTx = await this.web3.eth.accounts.signTransaction(tx, this.account.privateKey);
            await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                .on('receipt', receipt => {
                    return receipt.transactionHash;
                })
                .on('error', error => {
                    elizaLogger.error("Send blob to blockchain failed", error);
                    throw new Error('Transaction failed due to error: ' + error.message);
                });
        } catch (error) {
            elizaLogger.error("Send blob to blockchain failed", error);
        }

        return "";
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
