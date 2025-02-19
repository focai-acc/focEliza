import express from "express";
import { VerifiableStateService } from "./services/verifiableStateService";
import { ServiceType } from "@elizaos/core";
import type { Request, Response, Router } from "express";

export function createStateApiRouter(
    agents: Map<string, { getService: <T>(type: ServiceType) => T }>
): Router {
    const router = express.Router();

    // 获取所有注册状态
    router.get("/verifiable/states", async (req: Request, res: Response) => {
        try {
            const agent = getFirstAgent(agents);
            const service = agent.getService<VerifiableStateService>(
                ServiceType.VERIFIABLE_STATE
            );
            res.json({ states: await service.getRegisteredStates() });
        } catch (error) {
            handleError(res, error as Error);
        }
    });

    // 生成状态证明
    router.post("/verifiable/states/proof", async (req, res) => {
        try {
            const { stateName, key } = req.body;
            const agent = getFirstAgent(agents);
            const service = agent.getService<VerifiableStateService>(
                ServiceType.VERIFIABLE_STATE
            );
            const proof = await service.generateStateProof(stateName, key);
            res.json({ proof });
        } catch (error) {
            handleError(res, error as Error);
        }
    });

    // 获取TEE配置
    router.get("/verifiable/config", async (req, res) => {
        try {
            const agent = getFirstAgent(agents);
            const service = agent.getService<VerifiableStateService>(
                ServiceType.VERIFIABLE_STATE
            );
            res.json(service.getTeeConfig());
        } catch (error) {
            handleError(res, error as Error);
        }
    });

    return router;
}

// 辅助方法
function getFirstAgent(
    agents: Map<string, { getService: <T>(type: ServiceType) => T }>
): any {
    // 实现获取首个agent的逻辑
}

function handleError(res: express.Response, error: Error) {
    // 统一错误处理
}
