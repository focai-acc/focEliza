import { VerifiableState } from "../dist/index.js";
import { IAgentRuntime } from "@elizaos/core";
import { config } from "dotenv";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
config();

async function main() {
    // 创建一个新的 VerifiableState 实例
    const state = new VerifiableState();

    // 初始化插件
    const runtime: IAgentRuntime = {
        agentId: "test-agent-123",
        character: {
            name: "Test Agent"
        },
        getSetting: (key: string) => {
            // 使用静态配置模拟 SGX 环境
            const settings: { [key: string]: string } = {
                "ENABLE_TEE_STATE": "true",
                "SGX": "true",
                "TEE_MODE": "simulation" // 使用模拟模式
            };
            return settings[key] || null;
        }
    };

    await state.initialize(runtime);

    // 注册一个状态处理器
    state.registerState("userPreferences", (key: string) => {
        // 这是一个简单的配置对象
        const preferences = {
            theme: "dark",
            language: "zh-CN",
            fontSize: 16,
        };
        return preferences[key as keyof typeof preferences];
    });

    try {
        // 获取主题设置
        const themeResult = await state.getState("userPreferences", "theme");
        console.log("Theme:", themeResult);

        // 获取语言设置
        const langResult = await state.getState("userPreferences", "language");
        console.log("Language:", langResult);

        // 获取字体大小
        const fontResult = await state.getState("userPreferences", "fontSize");
        console.log("Font Size:", fontResult);

        // 验证某个状态值
        const isThemeDark = await state.verifyState(
            "userPreferences",
            "theme",
            "dark"
        );
        console.log("Is theme dark?", isThemeDark);

        // 获取并解析认证信息
        const attestationStr = await state['generateAttestation']('test-data');
        const attestation = JSON.parse(attestationStr) as {
            report: string;
            signature: string;
            certificateChain: string[];
        };
        console.log('Generated Attestation:', {
            report: attestation.report,
            signature: attestation.signature,
            certificateChain: attestation.certificateChain
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

// 运行示例
main().catch(console.error);
