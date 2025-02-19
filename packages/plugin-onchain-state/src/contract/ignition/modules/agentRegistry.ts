import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agentRegistry = m.contract("ElizaAgentRegistry", [
        "0xF5bC2a22Ca09A6C8133C018900Be9744e5bA05B8",
    ]);
    return { agentRegistry };
});
