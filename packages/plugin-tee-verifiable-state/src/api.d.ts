import { ServiceType } from "@elizaos/core";
import type { Router } from "express";
export declare function createStateApiRouter(agents: Map<string, {
    getService: <T>(type: ServiceType) => T;
}>): Router;
