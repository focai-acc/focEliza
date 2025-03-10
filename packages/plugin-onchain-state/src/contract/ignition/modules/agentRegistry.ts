import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agentRegistry = m.contract("ElizaAgentRegistry", [
        "0xaB80d0EdF8319c88d406114dD93b837a89779868",
    ]);
    return { agentRegistry };
});
