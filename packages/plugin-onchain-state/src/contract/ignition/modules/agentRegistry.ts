import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Eliza", (m) => {
    const agentRegistry = m.contract("ElizaAgentRegistry", [
        "0x47FEf69DdCAecdbdE5B6307940713b296d80c647",
    ]);
    return { agentRegistry };
});
