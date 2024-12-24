import { BlockStoreMsgType } from "@ai16z/eliza";

/**
 * Example header for demonstration
 */
export interface BlobHeader {
    /** Unique identifier */
    prev: any;

    /** Message type */
    msgType: BlockStoreMsgType;
}

/**
 * Interface for blockchain
 */
export type IBlockchain = {
    /**
     * Fetches the value associated with the specified key from the store.
     * @param idx - The unique identifier for the value to retrieve.
     * @returns A promise that resolves with the retrieved value.
     */
    pull: <T>(idx: string) => Promise<T>;
    /**
     * Stores a value in the store with an automatically generated key.
     * @param value - The value to store.
     * @returns A promise that resolves with the generated key for the stored value.
     */
    push: <T>(value: T) => Promise<string>;
};