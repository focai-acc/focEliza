import {
    bytesToHex,
    bytesToString,
    createPublicClient,
    createWalletClient,
    getAddress,
    getContract,
    hexToBytes,
    http,
    parseGwei,
    PrivateKeyAccount,
    stringToBytes,
} from "viem";
import * as contractAbi from "./source/StateManage.json"; // Fix the name to match file content

export class StateManageContractEndPoint {
    private publicClient;
    private walletClient;
    private contractAddress;
    private contractAbi;

    constructor(rpcUrl: string, chainId: number, contractAddress: string) {
        if (!rpcUrl) throw new Error("RPC URL is required");
        if (!contractAddress) throw new Error("Contract Address is required");

        // Create public and wallet clients
        this.publicClient = createPublicClient({
            transport: http(rpcUrl),
            chain: {
                id: chainId,
                name: "EthereumNetwork",
                nativeCurrency: {
                    decimals: 18,
                    name: "Ether",
                    symbol: "ETH",
                },
                rpcUrls: {
                    default: {
                        http: [rpcUrl],
                        webSocket: [],
                    },
                },
            },
        });

        this.walletClient = createWalletClient({
            transport: http(rpcUrl),
            chain: {
                id: chainId,
                name: "EthereumNetwork",
                nativeCurrency: {
                    decimals: 18,
                    name: "Ether",
                    symbol: "ETH",
                },
                rpcUrls: {
                    default: {
                        http: [rpcUrl],
                        webSocket: [],
                    },
                },
            },
        });

        this.contractAddress = contractAddress;
        this.contractAbi = contractAbi.abi;
    }

    // 读取方法：checkNamespaceOwner
    async checkNamespaceOwner(space: string, owner: string): Promise<boolean> {
        try {
            if (!space || !owner) {
                throw new Error("Space and Owner are required");
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.publicClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }

            return await contract.read.checkNamespaceOwner([space, owner]);
        } catch (error) {
            console.error("Error checking namespace owner:", error);
            throw new Error("Failed to check namespace owner");
        }
    }

    // 读取方法：read
    async read(
        account: PrivateKeyAccount,
        space: string,
        key: string
    ): Promise<{ value: string; version: number }> {
        try {
            if (!space || !key) {
                throw new Error("Space and Key are required");
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.publicClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }

            const [valueBytes, version] = await contract.read.read(
                [space, key],
                { account: account }
            );

            if (!valueBytes || !version) {
                throw new Error("Invalid result from contract read");
            }

            return {
                value: bytesToString(hexToBytes(valueBytes)),
                version: version,
            };
        } catch (error) {
            console.error("Error reading data:", error);
            throw new Error("Failed to read data");
        }
    }

    // 读取方法：readKVs
    async readKVs(
        account: PrivateKeyAccount,
        space: string,
        keys: string[]
    ): Promise<{ key: string; values: string; versions: bigint }[]> {
        try {
            if (!space || !keys || keys.length === 0) {
                throw new Error("Space and Keys are required");
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.publicClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }

            const result = await contract.read.readKVs([space, keys], {
                account: account,
            });
            if (!result || result.length < 2) {
                throw new Error("Invalid result from contract readKVs");
            }

            const [values, versions] = result;

            if (!values || !versions) {
                throw new Error(
                    "Values or Versions are missing in the response"
                );
            }

            return keys.map((key, index) => {
                const rawValue = values[index];

                // Check if rawValue is null or empty
                if (!rawValue || rawValue.length === 0) {
                    console.warn(`Empty value for key: ${key}`);
                    return {
                        key,
                        values: "", // Default value
                        versions: versions[index],
                    };
                }
                return {
                    key,
                    values: bytesToString(hexToBytes(rawValue)),
                    versions: versions[index],
                };
            });
        } catch (error) {
            console.error("Error reading key-values:", error);
            throw new Error("Failed to read key-values");
        }
    }

    // 写入方法：createNameSpace
    async createNameSpace(
        account: PrivateKeyAccount,
        space: string
    ): Promise<string> {
        try {
            if (!account || !space) {
                throw new Error("Account and Space are required");
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.walletClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }
            return await contract.write.createNameSpace([space], {
                account: account,
                gasLimit: 1000000, // Adjusted Gas Limit
                gasPrice: parseGwei("50"),
            });
        } catch (error) {
            console.error("Error creating namespace:", error);
            throw new Error("Failed to create namespace");
        }
    }

    // 写入方法：addNamespaceOwner
    async addNamespaceOwner(
        account: PrivateKeyAccount,
        space: string,
        newOwner: string
    ): Promise<string> {
        try {
            if (!account || !space || !newOwner) {
                throw new Error("Account, Space, and NewOwner are required");
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.walletClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }

            // Attempt to add the new owner to the namespace
            const hash = await contract.write.addNamespaceOwner(
                [space, newOwner],
                {
                    account: account,
                    gasLimit: 1000000, // Adjusted Gas Limit
                    gasPrice: parseGwei("50"), // Proper Gas price parsing
                }
            );
            console.log(
                `Successfully added ${newOwner} as an owner of space ${space}`
            );
            return hash;
        } catch (error) {
            console.error("Error adding namespace owner:", error);
            throw new Error("Failed to add namespace owner");
        }
    }

    // 写入方法：removeNamespaceOwner
    async removeNamespaceOwner(
        account: PrivateKeyAccount,
        space: string,
        ownerToRemove: string
    ): Promise<string> {
        try {
            if (!account || !space || !ownerToRemove) {
                throw new Error(
                    "Account, Space, and OwnerToRemove are required"
                );
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.walletClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }

            return await contract.write.removeNamespaceOwner(
                [space, ownerToRemove],
                {
                    account: account,
                    gasLimit: 1000000, // Adjusted Gas Limit
                    gasPrice: parseGwei("50"),
                }
            );
        } catch (error) {
            console.error("Error removing namespace owner:", error);
            throw new Error("Failed to remove namespace owner");
        }
    }

    // 写入方法：write
    async write(
        account: PrivateKeyAccount,
        space: string,
        key: string,
        value: string,
        expectedVersion: bigint = 0n
    ): Promise<string> {
        try {
            if (!account || !space || !key || value === undefined) {
                throw new Error("Account, Space, Key, and Value are required");
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.walletClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }
            const hexValue = bytesToHex(stringToBytes(value));
            return await contract.write.write(
                [space, key, hexValue, expectedVersion],
                {
                    account: account,
                    gasLimit: 1000000, // Adjusted Gas Limit
                    gasPrice: parseGwei("50"),
                }
            );
        } catch (error) {
            console.error("Error writing data:", error);
            throw new Error("Failed to write data");
        }
    }

    // 写入方法：writeKVs
    async writeKVs(
        account: PrivateKeyAccount,
        space: string,
        keys: string[],
        values: string[],
        expectedVersions: number[]
    ): Promise<string> {
        try {
            if (
                !account ||
                !space ||
                !keys ||
                keys.length === 0 ||
                !values ||
                values.length === 0
            ) {
                throw new Error(
                    "Account, Space, Keys, and Values are required"
                );
            }

            const contract = getContract({
                address: getAddress(this.contractAddress),
                abi: this.contractAbi,
                client: this.walletClient,
            });

            if (!contract) {
                throw new Error("Contract not found");
            }

            return await contract.write.writeKVs(
                [
                    space,
                    keys,
                    values.map((v) => bytesToHex(stringToBytes(v))),
                    expectedVersions,
                ],
                {
                    account: account,
                    gasLimit: 1000000, // Adjusted Gas Limit
                    gasPrice: parseGwei("50"),
                }
            );
        } catch (error) {
            console.error("Error writing key-values:", error);
            throw new Error("Failed to write key-values");
        }
    }
}
