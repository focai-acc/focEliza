import { describe, it, expect, beforeEach } from "vitest";
import { StateManageContractEndPoint } from "../contract/stateManageContract.ts"; // Adjust import path
import { PrivateKeyAccount, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { uuidV4, randomBytes } from "ethers";
// Use your RPC URL and Chain ID
const chainId = 11822; // Replace with the correct chain ID (1 for Ethereum mainnet, 3 for Ropsten, etc.)
const rpcUrl = "https://betanet-rpc2.artela.network"; // Example local RPC URL
const contractAddress = "0xe1c40e2B58c820496D598261eCC573230fEE4E08"; // Replace with your deployed contract address

describe("OnChainStateEndPoint", () => {
    let endpoint: StateManageContractEndPoint;
    let account: PrivateKeyAccount;

    // Initialize the endpoint before each test
    beforeEach(() => {
        endpoint = new StateManageContractEndPoint(
            rpcUrl,
            chainId,
            contractAddress
        );
        // Generate a private key account or use an existing one (ensure it's funded)
        account = privateKeyToAccount(
            "0x949a90e8d97b01c8d5fe10f3c169d55a6da71ae61ce2869ec4726b4aa080a040"
        ); // Replace with your private key {
    });

    it("should check if the namespace owner is correct", async () => {
        const uuidV = uuidV4(randomBytes(32));
        const space = "testNamespace" + uuidV;
        const owner = "0x9D42EB2f47592DCD87f4a51316317fc4eB4df216"; // Replace with a test address

        await endpoint.createNameSpace(account, space);
        // 暂停 2秒
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await endpoint.checkNamespaceOwner(space, owner);
        console.log(result);
        if (!result) {
            const addResult = await endpoint.addNamespaceOwner(
                account,
                space,
                owner
            );
            expect(addResult).not.null;

            // 暂停 2秒
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const result2 = await endpoint.checkNamespaceOwner(space, owner);
            expect(result2).toBe(true); // Change based on actual expected behavior

            const removeResult = await endpoint.removeNamespaceOwner(
                account,
                space,
                owner
            );
            expect(removeResult).not.null;

            // 暂停 2秒
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const result3 = await endpoint.checkNamespaceOwner(space, owner);
            expect(result3).toBe(false); // Change based on actual expected behavior
        } else {
            const removeResult = await endpoint.removeNamespaceOwner(
                account,
                space,
                owner
            );
            expect(removeResult).not.null;
            const result2 = await endpoint.checkNamespaceOwner(space, owner);
            expect(result2).toBe(false); // Change based on actual expected behavior
        }
    }, 200000);

    it("should read multiple key-value pairs", async () => {
        const space = "testSpace";
        const keys = ["key1", "key2"];

        const result = await endpoint.readKVs(account, space, keys);

        expect(result).toHaveLength(keys.length);
        result.forEach((item) => {
            expect(item).toHaveProperty("key");
            expect(item).toHaveProperty("values");
            expect(item).toHaveProperty("versions");
        });
    });

    it("should create a new namespace", async () => {
        const space = "newSpace";

        await endpoint.createNameSpace(account, space);

        // You could add a check here to confirm the namespace has been created,
        // like reading the value from the contract to ensure the operation was successful.
    });

    it("should write data to the contract", async () => {
        const key = "testKey1";
        const value = "testValue2";

        const uuidV = uuidV4(randomBytes(32));
        const space = "testSpace" + uuidV;
        await endpoint.createNameSpace(account, space);

        await endpoint.write(account, space, key, value);
        // 暂停 2秒
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Optionally, verify the write by reading the value back
        const result = await endpoint.read(account, space, key);
        expect(result.value).toBe(value);
    }, 200000);

    it("should write multiple key-value pairs to the contract", async () => {
        const keys = ["key1", "key2"];
        const values = ["value1", "value2"];
        const expectedVersions = [0, 0];

        const uuidV = uuidV4(randomBytes(32));
        const space = "testSpace" + uuidV;
        await endpoint.createNameSpace(account, space);
        await endpoint.writeKVs(account, space, keys, values, expectedVersions);
        // 暂停 2秒
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Optionally, verify the writes by reading back values
        const result = await endpoint.readKVs(account, space, keys);
        result.forEach((item, index) => {
            expect(item.values).toBe(values[index]);
        });
    }, 200000);
});
