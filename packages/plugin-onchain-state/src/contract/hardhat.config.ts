import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";
require("dotenv").config();

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    paths: {
        sources: "./src",
        artifacts: "./artifacts",
    },
    networks: {
        opSepolia: {
            url: process.env.ALCHEMY_RPC_URL,
            accounts: [`${process.env.WALLET_PRIVATE_KEY}`],
            chainId: 11155420,
        },
    },
    etherscan: {
        apiKey: {
            opSepolia: `${process.env.ETHERSCAN_API_KEY}`,
        },
        customChains: [
            {
                network: "opSepolia",
                chainId: 11155420,
                urls: {
                    apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
                    browserURL: "https://sepolia-optimism.etherscan.io/",
                },
            },
        ],
    },
    sourcify: {
        // Disabled by default
        // Doesn't need an API key
        enabled: true,
    },
};

export default config;
