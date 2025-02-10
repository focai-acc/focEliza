# @focai/plugin-tee-verifiable-state

Decentralized state management plugin with callback-based storage

## Features

- 🚀 Callback-based state management
- 🔒 Type-safe interface
- 🌐 Support both sync/async callbacks
- 🛡 Namespace validation

## Installation
```bash
npm install @focai/plugin-tee-verifiable-state
```

## Usage
```typescript
import { VerifiableState } from '@focai/plugin-tee-verifiable-state';

const state = new VerifiableState();
await state.initialize();

// Register state callback
state.registerState('config', (key) => {
  return {
    theme: 'dark',
    language: 'zh-CN'
  }[key];
});

// Get state
const theme = await state.getState('config', 'theme');
console.log(theme); // 'dark'
```
