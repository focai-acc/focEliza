import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    ActionExample,
    composeContext,
    booleanFooter,
    generateTrueOrFalse,
    ModelClass,
} from "@elizaos/core";
import fs from "fs";
import path from "path";
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const GreenfieldSDK = require('@bnb-chain/greenfield-js-sdk');

const { Client } = GreenfieldSDK;

export const uploadTemplate =
    `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} upload character file unless explicitly mentioned?

Respond with YES if:
- The user has directly asked {{agentName}} to upload character file
- The user requests to upload character file

Otherwise, respond with NO.
` + booleanFooter;

export const gfUpload: Action = {
    name: "GF_UPLOAD",
    similes: [
        "SAVE_CHARACTER_FILE_TO_GREENFIELD",
        "UPLOAD_CHARACTER_FILE_TO_GREENFIELD",
    ],
    description: "Store character file using greenfield",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const gfRpc = !!runtime.getSetting("GREENFIELD_RPC");
        const gfPrivateKey = !!runtime.getSetting("GREENFIELD_PRIVATE_KEY");
        return gfRpc && gfPrivateKey;
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        async function _shouldUpload(state: State): Promise<boolean> {
            const shouldUploadContext = composeContext({
                state,
                template: uploadTemplate,
            });

            const response = await generateTrueOrFalse({
                runtime,
                context: shouldUploadContext,
                modelClass: ModelClass.LARGE,
            });

            return response;
        }

        const state = await runtime.composeState(message);
        if (await _shouldUpload(state)){
            console.log("GF_UPLOAD action called");

            const charactersDir = "../characters/";
            const name = runtime.character.name;
            try {
                fs.readdir(charactersDir, (err, files) => {
                    if (err) {
                        console.error("Error reading characters directory:", err);
                        return;
                    }
                    // Iterate through each file in the directory
                    files.forEach(file => {
                        if (path.extname(file) === '.json') {
                            const filePath = path.join(charactersDir, file);

                            // Read the contents of the JSON file
                            fs.readFile(filePath, 'utf8', (err, data) => {
                                if (err) {
                                    console.error(`Error reading file ${filePath}:`, err);
                                    return;
                                }
                                try {
                                    const jsonData = JSON.parse(data);
                                    if (jsonData.name === name) {
                                        upload(runtime, filePath, file);
                                    }
                                } catch (error) {
                                    console.error(`Error parsing JSON file ${filePath}:`, error);
                                }
                            });
                        }
                    });
                });
            } catch (error) {
                console.error("Error getting settings for 0G upload:", error);
            }
        }

    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "upload character file",
                    action: "GF_UPLOAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you help me upload character file?",
                    action: "GF_UPLOAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to upload character file",
                    action: "GF_UPLOAD",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

export async function upload(runtime: IAgentRuntime, filePath:string, objectName:string) {
    const greenFieldRpc = runtime.getSetting("GREENFIELD_RPC");
    const greenFieldChainId = runtime.getSetting("GREENFIELD_RPC_CHAINID");
    const client = Client.create(greenFieldRpc, greenFieldChainId);
    const gfKey = runtime.getSetting("GREENFIELD_PRIVATE_KEY");
    const bucketName = runtime.getSetting("GREENFIELD_BUCKET_NAME");
    const file = createFile(filePath);

    const res = await client.object.delegateUploadObject(
      {
        bucketName: bucketName,
        objectName: objectName,
        body: file,
        delegatedOpts: {
          visibility: GreenfieldSDK.VisibilityType.VISIBILITY_TYPE_PRIVATE,
        },
      },
      {
        type: 'ECDSA',
        privateKey: gfKey,
      },
    );
}

export async function download(runtime: IAgentRuntime, filePath:string, objectName:string) {
    const greenFieldRpc = runtime.getSetting("GREENFIELD_RPC");
    const greenFieldChainId = runtime.getSetting("GREENFIELD_RPC_CHAINID");
    const client = Client.create(greenFieldRpc, greenFieldChainId);
    const gfKey = runtime.getSetting("GREENFIELD_PRIVATE_KEY");
    const bucketName = runtime.getSetting("GREENFIELD_BUCKET_NAME");

    if (fs.existsSync(filePath)) {
        console.log(`File ${filePath} already exists. Skipping download.`);
        return;
    }
    const res = await client.object.getObject(
        {
            bucketName: bucketName,
            objectName: objectName,
        },
        {
            type: 'ECDSA',
            privateKey: gfKey,
        }
    ).then((res) => {res.body.arrayBuffer().then(buffer => {
            const nodeBuffer = Buffer.from(buffer);
            fs.writeFileSync(filePath, nodeBuffer); })
            .catch(err => { console.error('Error:', err); });
    })
}

function createFile(path) {
    const stats = fs.statSync(path);
    const fileSize = stats.size;

    return {
      name: path,
      type: '',
      size: fileSize,
      content: fs.readFileSync(path),
    }
}