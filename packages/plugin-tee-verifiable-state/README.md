# @yueliao11/plugin-tee-verifiable-state

A TEE-based verifiable state service plugin that provides secure state management and verification capabilities.

## Installation

```bash
npm install @yueliao11/plugin-tee-verifiable-state
```

## Usage

Here's a basic example of how to use the plugin:

```typescript
import { VerifiableState } from "@yueliao11/plugin-tee-verifiable-state";

async function main() {
    // Create a new VerifiableState instance
    const state = new VerifiableState();

    // Initialize the plugin
    await state.initialize();

    // Register a state handler
    state.registerState("userPreferences", (key: string) => {
        const preferences = {
            theme: "dark",
            language: "zh-CN",
            fontSize: 16,
        };
        return preferences[key];
    });

    // Get state values
    const theme = await state.getState("userPreferences", "theme");
    console.log("Theme:", theme);

    // Verify state values
    const isThemeDark = await state.verifyState(
        "userPreferences",
        "theme",
        "dark"
    );
    console.log("Is theme dark?", isThemeDark);
}
```

## API

### `VerifiableState`

The main class that provides state management functionality.

#### Methods

- `initialize()`: Initialize the TEE environment
- `registerState(stateName: string, handler: (key: string) => any)`: Register a new state handler
- `getState(stateName: string, key: string)`: Get a state value
- `verifyState(stateName: string, key: string, expectedValue: any)`: Verify if a state matches an expected value

dev env：
env
CopyInsert
ENABLE_TEE_STATE=true
SGX=true
TEE_MODE=simulation

product env：
env
CopyInsert
ENABLE_TEE_STATE=true
SGX=true
TEE_MODE=hardware
## License

MIT
