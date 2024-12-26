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
        if (id == "") {
            throw new Error("id cannot be empty");
        }
        this.id = id;
        this.database = database;
        this.blockChain = createBlockchain(process.env.BLOCKSTORE_CHAIN);
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
            const message: Message = JSON.parse(blobData);
            if (!message || !message.blob) {
                throw new Error("Detected invalid data on the blockchain");
            }
            elizaLogger.info(`Restore blob ${header.prev} from blockchain`);

            for (const blob of message.blob) {
                switch (blob.msgType) {
                    case BlockStoreMsgType.memory: {
                        const memory = JSON.parse(blob.data);
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

    async restoreCharacter(character: Character): Promise<Character> {
        const headers = await this.getAllBlobHeaders();

        if (headers.length < 2) {
            throw new Error("Character idx not found");
        }

        // restore character
        const characterHeader = headers[headers.length - 2];
        const blobData = await this.blockChain.pull<string>(characterHeader.prev);
        const message: Message = JSON.parse(blobData);
        if (!message) {
            throw new Error("Detected invalid data on the blockchain");
        }

        if (
            !message ||
            !message.blob ||
            message.blob.length === 0 ||
            message.blob[0].msgType !== BlockStoreMsgType.character
        ) {
            throw new Error("Character data of blob is not valid");
        }

        // reset the character from the stored data
        character = JSON.parse(message.blob[0].data);
        elizaLogger.info("Restore Character from blockchain");

        return character;
    }

    async getAllBlobHeaders(): Promise<BlobHeader[]> {
        let headers: BlobHeader[] = [];

        let prev = await new Registry().getValue(this.id);
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
                const message: Message = JSON.parse(blobData);
                if (!message) {
                    throw new Error("Detected invalid data on the blockchain");
                }
                headers.push({
                    prev: message.prev,
                });
                prev = message.prev;

                if (prev == null || prev == "") {
                    break;
                }
            }
        } catch (error) {
            console.error('Error fetching values:', error);
        }

        return headers;
    }
}