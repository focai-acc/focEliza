import Queue from 'queue';
import {
    IBlockStoreAdapter,
    BlockStoreMsgType,
    elizaLogger,
} from '@ai16z/eliza';
import { IBlockchain } from './types';
import { createBlockchain } from "./blockchain";

export class BlockStoreQueue implements IBlockStoreAdapter {
    private queue;
    private isProcessing: boolean = false;
    private blockChain: IBlockchain;

    constructor() {
        this.queue = new Queue({ concurrency: 1 });
        this.blockChain = createBlockchain(process.env.BLOCKSTORE_CHAIN);

        this.startProcessing();
    }

    async enqueue<T>(msgType: BlockStoreMsgType, msg: T): Promise<void> {
        const task = async () => {
            console.log(`Processing task: ${BlockStoreMsgType[msgType]}, Message:`, msg);
            await this.processTask(msgType, msg);
            console.log(`Task completed: ${BlockStoreMsgType[msgType]}`);
          };

          this.queue.push(task);

          if (!this.isProcessing) {
            this.startProcessing();
          }
    }

    private async startProcessing(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0 || this.queue.pending > 0) {
          await new Promise<void>((resolve, reject) => {
            this.queue.start((err) => {
              if (err) {
                elizaLogger.error('Error processing queue:', err);
                reject(err);
              } else {
                resolve();
              }
            });
          });
        }

        this.isProcessing = false;
    }

    private async processTask<T>(msgType: BlockStoreMsgType, msg: T): Promise<void> {
            return new Promise((resolve) => {
            // marshal server messages, submit to block chain
            console.log("----------------------------process on chain task...", msgType, msg);
        });
    }
}