import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agentRegistry = m.contract("ElizaAgentRegistry", [
        "0xD78e02F00E89094a588e3674eDc5BD62eb8c9E57",
    ]);
    return { agentRegistry };
});
