import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agent = m.contract("ElizaAgent", []);
    return { agent };
});
