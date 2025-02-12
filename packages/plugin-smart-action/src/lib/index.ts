import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { z } from "zod";

/**
 * Composes a action context by adding a structured header and footer to the prompt.
 *
 * @param {Record<string, any>} state - A set of key-value pairs representing the current state.
 * @param {string} prompt - The prompt returned by the `composeContext` function.
 * @returns {string} The formatted action context.
 */
export const composeSmartActionContext = async (
    state: Record<string, any>,
    prompt: string,
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
): Promise<string> => {
    // Serialize the state key-value pairs into a JSON string
    const serializedState = JSON.stringify(state, null, 2);

    // Construct the action context
    const actionContext = `### **Instruction: Execute a State Transition Function**
You are required to execute a **state transition function** based on the provided JSON state input.
Process the following **prompt** logically and accurately based on the current **state**, while taking into account the user's recent conversation for additional context and intent.

### **🎭 Character Role and Background**
You must act as the character **{{agentName}}**.
- **Bio**: {{bio}}
- **Lore**: {{lore}}
- **Attachments**: {{attachments}}

### **🧠 Capabilities**
- {{agentName}} can read/see/hear various media types: **images, videos, audio, plaintext, PDFs**.
- Recent attachments are available in the **"Attachments"** section.

### **📌 Message Directions**
{{messageDirections}}

### **💬 Recent Conversation (Context Awareness)**
Review the following recent conversation to extract any additional user intent or inputs:
{{recentMessages}}

### **📝 Your Task**
UserState:
${serializedState}

${prompt}

####. **Handling Insufficient Information:**
   - If the conversation does not include sufficient information to update one or more of the required fields, do not change the state.
   - Instead, output a JSON object with:
     - \`"result": false\`
     - An empty \`"states"\` array.
     - A \`"msg"\` field explaining exactly which details are missing and what additional input is required.

####. **Executing the State Transition:**
    - If all necessary details are present and the task is clear, update every required field. For each field, use the new value provided in the conversation; if no new value is provided, use the existing value from the UserState.
    - Return a JSON object with:
    - \`"result": true\`
    - A success message in \`"msg"\`.
---

### **📤 Output Schema (Strict JSON Format)**
Your output **must** be a JSON object that strictly conforms to the following schema:
\`\`\`json
{
  "result": true or false,  // Boolean indicating success or failure
  "msg": "string",          // A success message or an error explanation (must not be empty)
  "states": [               // Array of modified state entries
    {
      "key": "string",      // The name of the state field to update
      "value": <any>        // The new value for this state field
    }
  ]
}\`\`\`
`.trim();

        // Initialize or update state
        if (!_state) {
            _state = (await runtime.composeState(_message)) as State;
        } else {
            _state = await runtime.updateRecentMessageState(_state);
        }

        // Compose context for bind wallet
        const finalContext = composeContext({
            state: _state,
            template: actionContext
        });

    return finalContext;
};

export const smartActionSchema = z.object({
    result: z.boolean(),
    msg: z.string().nullable(),
    states: z.array(z.object({ key: z.string(), value: z.any() })).nullable(),
});

export interface SmartActionResult {
    result: boolean | false;
    msg: string | null;
    states: [{key:string, value:string}] | null;
}