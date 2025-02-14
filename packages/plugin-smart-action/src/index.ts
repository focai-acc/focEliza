import {
    IAgentRuntime,
    Service,
    ServiceType,
    Plugin,
    Memory,
    State,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { SmartActionResult, composeSmartActionContext, smartActionSchema } from "./lib";

export class SmartActionService extends Service {
    getInstance(): SmartActionService {
        return this;
    }

    static get serviceType(): ServiceType {
        return ServiceType.SMART_ACTION;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
    }

    async generateObject(
        state: Record<string, any>,
        prompt: string,
        modelClass: ModelClass,
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
    ): Promise<SmartActionResult> {
        const userContext = await composeSmartActionContext(state, prompt, runtime, _message, _state);

        const result = await generateObject({
            runtime,
            context: userContext,
            modelClass: modelClass,
            schema: smartActionSchema,
        });

        return result.object as SmartActionResult;
    }
}

export const smartActionPlugin: Plugin = {
    name: "SmartActionPlugin",
    description:
        "SmartAction plugin for Eliza to compose smart action.",
    actions: [],
    evaluators: [],
    providers: [],
    services: [new SmartActionService()],
};

export { SmartActionResult } from "./lib";