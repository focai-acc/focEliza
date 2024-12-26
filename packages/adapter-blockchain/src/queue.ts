import Queue from 'queue';
import {
    IBlockStoreAdapter,
    BlockStoreMsgType,
    elizaLogger,
} from '@ai16z/eliza';
import { IBlockchain, Message } from './types';
import { createBlockchain } from "./blockchain";
import { Registry } from './registry';

export class BlockStoreQueue implements IBlockStoreAdapter {
    private queue;
    private isProcessing: boolean = false;
    private blockChain: IBlockchain;
    private registry: Registry;
    private id: string;

    private buffer: { msgType: BlockStoreMsgType; msg: any }[] = [];
    private bufferLimit: number = 10;
    private timeout: number = 10000;
    private timeoutHandle: NodeJS.Timeout | null = null;

    constructor(id: string) {
        this.queue = new Queue({ concurrency: 1 });
        this.blockChain = createBlockchain(process.env.BLOCKSTORE_CHAIN);
        this.registry = new Registry();
        this.id = id;

        this.startProcessing();
    }

    async enqueue<T>(msgType: BlockStoreMsgType, msg: T): Promise<void> {
        this.buffer.push({ msgType, msg });

        if (this.buffer.length >= this.bufferLimit) {
            this.flushBuffer();
        } else if (!this.timeoutHandle) {
            this.timeoutHandle = setTimeout(() => this.flushBuffer(), this.timeout);
        }
    }

    private flushBuffer(): void {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }

        if (this.buffer.length === 0) return;

        const tasks = this.buffer.slice();
        this.buffer = [];

        const task = async () => {
            try {
                elizaLogger.debug(`Processing batch task with ${tasks.length} messages.`);
                await this.processBatchTask(tasks);
                elizaLogger.debug(`Batch task completed.`);
            } catch (err) {
                elizaLogger.error('Batch task failed, re-queuing messages:', err);
                tasks.forEach(({ msgType, msg }) => this.enqueue(msgType, msg));
            }
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

    private async processBatchTask(tasks: { msgType: BlockStoreMsgType; msg: any }[]): Promise<void> {
        // get last idx
        const idx = await this.registry.getValue(this.id);

        // marshal the messages
        const blob = tasks.map(({ msgType, msg }) => ({
            msgType,
            data: JSON.stringify(msg).trim(),
        }));

        const message: Message = {
            prev: idx,
            blob: blob,
        };

        const uIdx = await this.blockChain.push(JSON.stringify(message).trim());

        // update idx
        const ret = await this.registry.registerOrUpdate(this.id, uIdx);
        if (!ret) {
            elizaLogger.error("Update registry failed");
        } else {
            elizaLogger.info(`Upload messages with idx ${uIdx} to blockchain`);
        }
    }
}
