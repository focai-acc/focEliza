import { Service, ServiceType } from "@elizaos/core";
import { VerifiableState } from "../index";
import { createStateApiRouter } from "../routes/stateApiRouter";
export class VerifiableStateService extends Service {
    static get serviceType() {
        return ServiceType.VERIFIABLE_STATE;
    }
    async initialize(runtime) {
        // 初始化TEE配置
        const enableTee = runtime.getSetting("ENABLE_TEE_STATE") === "true";
        const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;
        // 创建状态管理器实例
        this.stateManager = new VerifiableState();
        await this.stateManager.initialize(runtime);
        // 注册API路由
        runtime.registerRouter?.("/verifiable-state", createStateApiRouter(runtime.agentManager.agents));
    }
    async shutdown() {
        // 清理资源
        this.stateManager?.shutdown();
    }
    // 获取所有注册状态处理器
    async getRegisteredStates() {
        return Array.from(Object.keys(this.stateManager?.handlers || {}));
    }
    // 生成状态证明
    async generateStateProof(stateName, key) {
        return this.stateManager.getState(stateName, key);
    }
    // 查询验证记录
    async queryVerifications(query) {
        // 实现查询逻辑（需添加存储层）
    }
    // 获取TEE配置
    getTeeConfig() {
        return this.stateManager.getTeeConfig();
    }
}
// 插件入口
export const verifiableStatePlugin = {
    services: [new VerifiableStateService()],
};
