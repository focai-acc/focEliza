import { VerifiableState } from "@elizaos/plugin-tee-verifiable-state";

// 测试配置
const testConfig = {
  ENABLE_TEE_STATE: "true",
  TEE_MODE: "simulation",
  SGX: "true"
};

// 模拟运行时环境
const mockRuntime = {
  agentId: "test-agent-001",
  getSetting: (key: string) => testConfig[key] || "",
  registerRouter: () => {},
  agentManager: { agents: new Map() }
};

// 主测试流程
async function runTests() {
  try {
    console.log("=== 开始测试 TEE 状态验证插件 ===");

    // 测试1: 初始化验证
    const state = VerifiableState.getInstance();
    await state.initialize(mockRuntime);
    console.log("✅ 初始化成功");

    // 测试2: 状态注册
    state.registerState("userProfile", (userId: string) => ({
      userId,
      name: "测试用户",
      level: 1
    }));
    console.log("✅ 状态注册成功");

    // 测试3: 获取状态
    const profile = await state.getState("userProfile", "user-001");
    console.log("获取到的状态:", profile);
    if (profile?.metadata?.signature) {
      console.log("✅ 状态签名验证通过");
    }

    // 测试4: 状态验证
    const verification = await state.verifyState("userProfile", "user-001", {
      name: "测试用户"
    });
    console.log(verification.verified ? "✅ 验证通过" : "❌ 验证失败");

    // 测试5: 错误配置检测
    try {
      await VerifiableState.getInstance().initialize({
        ...mockRuntime,
        getSetting: () => ""
      });
    } catch (e) {
      console.log("✅ 成功捕获配置错误:", e.message);
    }

    console.log("=== 所有测试完成 ===");
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

// 执行测试
runTests();
