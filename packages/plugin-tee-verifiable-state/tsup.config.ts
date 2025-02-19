import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs"], // 改为生成CommonJS模块
    shims: true, // 自动添加ESM-CJS兼容层
    target: "node14", // 明确指定Node环境
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
});
