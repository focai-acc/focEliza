import { TEEMode } from "@elizaos/plugin-tee";

export enum TeeType {
    SGX_GRAMINE = "sgx_gramine",
    TDX_DSTACK = "tdx_dstack",
}

export interface StateMetadata {
    value: any;
    proof: string;
    timestamp: number;
}

export interface StateVerification {
    valid: boolean;
    message?: string;
}

export interface TeeConfig {
    enabled: boolean;
    teeType?: TeeType;
    teeMode?: TEEMode;
    attestation?: string;
    simulation?: boolean;
}

export interface SgxAttestation {
    /**
     * Base64 编码的 SGX 报告
     */
    report: string;
    /**
     * Base64 编码的数字签名
     */
    signature: string;
    /**
     * 证书链
     */
    certificateChain: string[];
}

export interface TEEConfig {
    mode: string;
    enabled: boolean;
}
