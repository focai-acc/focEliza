import {
    VerifiableStateService,
    verifiableStatePlugin,
} from "../dist/index.js";
import { IAgentRuntime, ServiceType, AgentRuntime } from "@elizaos/core";
import { config } from "dotenv";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
config();

async function main() {
    // 创建模拟运行时环境
    const runtime = new AgentRuntime({
        agentId: "test-agent-123",
        plugins: [verifiableStatePlugin], // 注册插件
        character: { name: "Test Agent" },
        getSetting: (key: string) =>
            ({
                ENABLE_TEE_STATE: "true",
                SGX: "true",
                TEE_MODE: "simulation",
            })[key],
    });

    // 添加初始化调用
    await runtime.initialize();

    // 获取服务实例
    const service = runtime.getService<VerifiableStateService>(
        ServiceType.VERIFIABLE_STATE
    );

    // 注册状态处理器（通过服务接口）
    service.registerState("userPreferences", (key: string) => {
        const preferences = { theme: "dark", language: "zh-CN", fontSize: 16 };
        return preferences[key as keyof typeof preferences];
    });

    try {
        // 测试状态获取
        const theme = await service.getState("userPreferences", "theme");
        console.log("Theme via service:", theme);

        // 测试验证功能
        const isValid = await service.verifyState(
            "userPreferences",
            "theme",
            "dark"
        );
        console.log("Validation result:", isValid);

        // 测试API端点
        const res = await fetch(
            "http://localhost:3000/verifiable-state/states"
        );
        console.log("Registered states:", await res.json());
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await runtime.shutdown(); // 测试服务关闭
    }
}

// 运行示例
main().catch(console.error);
