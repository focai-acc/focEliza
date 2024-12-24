import { BlobHeader } from "./types";
import { Registry } from "./registry";
import {
    IBlockStoreAdapter,
    BlockStoreMsgType,
    IDatabaseAdapter,
    Character,
    elizaLogger,
    type Memory,
 } from "@ai16z/eliza";

export class BlockStoreUtil {
    private blockStoreAdapter: IBlockStoreAdapter;
    private database?: IDatabaseAdapter;
    private id: string;

    constructor(id: string, blockStoreAdapter: IBlockStoreAdapter, database?: IDatabaseAdapter) {
        if (id == "") {
            throw new Error("id cannot be empty");
        }
        this.id = id;
        this.blockStoreAdapter = blockStoreAdapter;
        this.database = database;
    }

    async restoreMemory() {
        if (!this.database) {
            throw new Error("database is not valid");
        }

        const headers = await this.getAllBlobHeaders();

        // loop all the blobs via prev, but the first
        for (let i = headers.length - 2; i >= 0; i--) {
            const header = headers[i];
            const blob = await this.blockStoreAdapter.pull<string>(header.prev);
            const {msgType, message} = await BlobUtil.decomposeBlob(blob);
            switch (msgType) {
                case BlockStoreMsgType.memory: {
                    const memory = JSON.parse(message);
                    if (await this.database.getMemoryById(memory.id) == null) {
                        await this.database.createMemory(memory, "message");
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    async restoreCharacter(character: Character): Promise<Character> {
        const headers = await this.getAllBlobHeaders();

        if (headers.length < 2) {
            throw new Error("character not found");
        }

        // restore character
        const characterHeader = headers[headers.length - 2];
        const blob = await this.blockStoreAdapter.pull<string>(characterHeader.prev);
        const {msgType, message} = BlobUtil.decomposeBlob(blob);
        if (msgType != BlockStoreMsgType.character) {
            throw new Error("character data of blob is not valid");
        }
        // reset the character from the stored data
        character = JSON.parse(message);

        return character;
    }

    async getAllBlobHeaders(): Promise<BlobHeader[]> {
        let headers: BlobHeader[] = [];

        let prev = await new Registry().getHash(this.id);
        if (prev) {
            throw new Error("agent not found on chain");
        }
        // fetch the all the idxs
        let msgType;
        headers.push({
            prev: prev,
            msgType: msgType,
        });

        try {
            while(true) {
                const blobData = await this.blockStoreAdapter.pull<string>(prev);
                // read idx from value
                if (blobData) {
                    ({ prev, msgType } = BlobUtil.decomposeBlob(blobData));
                    headers.push({
                        prev: prev,
                        msgType: msgType,
                    });
                }
                if (prev == null) {
                    break;
                }
            }
        } catch (error) {
            console.error('Error fetching values:', error);
        }

        return headers;
    }
}

export class BlobUtil {
    static decomposeBlob(blob: string): { prev: any, msgType: string, message: string } {
        const parts = blob.split('|');
        if (parts.length != 3) {
            throw new Error("blob data is not valid");
        }
        return { prev: parts[0], msgType: parts[1], message: parts[2] };
    }

    static composeBlob(data: string, msgType: string, prev: string): string {
        return prev + "" + msgType + "|" + data;
    }
}