import { Plugin } from "@elizaos/core";
import { gfUpload } from "./actions/upload.ts";

export const greenfieldPlugin: Plugin = {
    description: "GreenField Plugin for Eliza",
    name: "GreenField",
    actions: [gfUpload],
    evaluators: [],
    providers: [],
};
