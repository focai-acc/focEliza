import { IBlockStoreAdapter, BlockStoreMsgType } from "@ai16z/eliza";

/**
 * Example header for demonstration
 */
export interface BlobHeader {
    /** Unique identifier */
    prev: any;

    /** Message type */
    msgType: BlockStoreMsgType;
}