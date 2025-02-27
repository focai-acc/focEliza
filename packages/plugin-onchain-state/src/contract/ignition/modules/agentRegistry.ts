import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agentRegistry = m.contract("ElizaAgentRegistry", [
        "0x36e9B3b48C5f0D7aABF9642D69bD58E2641A1B38",
    ]);
    return { agentRegistry };
});
