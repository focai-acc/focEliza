import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agentRegistry = m.contract("ElizaAgentRegistry", [
        "0xa13A6C90F7C296Dc383a97859BFfc43E6081f9a4",
    ]);
    return { agentRegistry };
});
