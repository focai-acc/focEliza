import fs from 'fs';
/**
 * 检查 SGX 环境是否可用
 * @returns boolean 环境是否可用
 */
export function checkSGXEnvironment() {
    try {
        // 检查至少需要存在的 SGX 设备文件
        fs.accessSync('/dev/attestation/quote', fs.constants.R_OK);
        fs.accessSync('/dev/attestation/user_report_data', fs.constants.W_OK);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * 获取当前 TEE 模式
 * @returns string 当前模式
 */
export function getTEEMode() {
    return process.env.TEE_MODE || 'hardware';
}
/**
 * 是否为模拟模式
 * @returns boolean
 */
export function isSimulationMode() {
    return getTEEMode() === 'simulation';
}
