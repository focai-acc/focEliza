import { BlobHeader, IBlockchain, Message } from "./types";
import { Registry } from "./registry";
import { createBlockchain } from "./blockchain";
import {
    BlockStoreMsgType,
    IDatabaseAdapter,
    Character,
    elizaLogger,
    type Memory,
 } from "@ai16z/eliza";

export class BlockStoreUtil {
    private blockChain: IBlockchain;
    private database?: IDatabaseAdapter;
    private id: string;

    constructor(id: string, database?: IDatabaseAdapter) {
        if (id === "") {
            throw new Error("Agent id cannot be empty");
        }
        this.id = id;
        this.database = database;
        this.blockChain = createBlockchain(process.env.BLOCKSTORE_CHAIN);
    }

    async restoreCharacter(): Promise<Character> {
        const idx = (await new Registry().getCharacter(this.id)).trim();
        if (idx === "") {
            throw new Error(`Character data for agent id ${this.id} is not valid`);
        }

        const blobData = await this.blockChain.pull<string>(idx);

        const character = JSON.parse(blobData.trim());
        elizaLogger.info("Recovering Character from blockchain");

        return character;
    }

    async restoreMemory() {
        if (!this.database) {
            throw new Error("database is not valid");
        }

        const headers = await this.getAllBlobHeaders();

        // loop all the blobs via prev, but the first
        for (let i = headers.length - 2; i >= 0; i--) {
            const header = headers[i];
            const blobData = await this.blockChain.pull<string>(header.prev);
            const message: Message = JSON.parse(blobData.trim());
            if (!message || !message.blob) {
                throw new Error("Detected invalid data on the blockchain");
            }
            elizaLogger.info(`Recovering memories at blob index ${header.prev} from blockchain`);

            for (const blob of message.blob) {
                switch (blob.msgType) {
                    case BlockStoreMsgType.memory: {
                        const memory = JSON.parse(blob.data.trim());
                        if (await this.database.getMemoryById(memory.id) == null) {
                            await this.database.createMemory(memory, "message");
                        }
                        break;
                    }
                    case BlockStoreMsgType.character: {
                        break;
                    }
                    default:
                        break;
                }
            }
        }
    }

    private async getAllBlobHeaders(): Promise<BlobHeader[]> {
        let headers: BlobHeader[] = [];
        const count = this.parseRecoveryCount(process.env.BLOCKSTORE_RECOVERY_BLOB_COUNT, Number.MAX_SAFE_INTEGER);

        let prev = await new Registry().getBlobIdx(this.id);
        if (!prev || prev.trim() === "") {
            throw new Error(`Agent id ${this.id} not found on chain`);
        }
        // fetch the all the idxs
        headers.push({
            prev: prev,
        });

        try {
            while(true) {
                const blobData = await this.blockChain.pull<string>(prev);
                // read idx from value
                const message: Message = JSON.parse(blobData.trim());
                if (!message) {
                    throw new Error("Detected invalid data on the blockchain");
                }
                headers.push({
                    prev: message.prev,
                });
                prev = message.prev;

                if (prev === null || prev === "" || headers.length > count) {
                    break;
                }
            }
        } catch (error) {
            elizaLogger.error('Error fetching values:', error);
        }

        return headers;
    }

    private parseRecoveryCount(envValue: string|undefined, defaultValue: number): number {
        if (envValue !== undefined) {
            const value = process.env[envValue]?.trim().toLowerCase();
            if (value === "all") return -1;
            const parsed = parseInt(envValue, 10);
            if (!isNaN(parsed) && parsed >= 0) return parsed;
        }

        return defaultValue;
    }
}