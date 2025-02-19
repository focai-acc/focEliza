import express from "express";
import { ServiceType } from "@elizaos/core";
export function createStateApiRouter(agents) {
    const router = express.Router();
    // 获取所有注册状态
    router.get("/verifiable/states", async (req, res) => {
        try {
            const agent = getFirstAgent(agents);
            const service = agent.getService(ServiceType.VERIFIABLE_STATE);
            res.json({ states: await service.getRegisteredStates() });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // 生成状态证明
    router.post("/verifiable/states/proof", async (req, res) => {
        try {
            const { stateName, key } = req.body;
            const agent = getFirstAgent(agents);
            const service = agent.getService(ServiceType.VERIFIABLE_STATE);
            const proof = await service.generateStateProof(stateName, key);
            res.json({ proof });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // 获取TEE配置
    router.get("/verifiable/config", async (req, res) => {
        try {
            const agent = getFirstAgent(agents);
            const service = agent.getService(ServiceType.VERIFIABLE_STATE);
            res.json(service.getTeeConfig());
        }
        catch (error) {
            handleError(res, error);
        }
    });
    return router;
}
// 辅助方法
function getFirstAgent(agents) {
    // 实现获取首个agent的逻辑
}
function handleError(res, error) {
    // 统一错误处理
}
