import { ec as EC } from "elliptic";
import { keccak256 } from "ethereum-cryptography/keccak";

// 初始化 ECDSA 曲线（secp256k1）
const ec = new EC("secp256k1");

export async function signMessage(evmKeypair, message) {
    // Step 1: 获取私钥
    const privateKey = evmKeypair.privateKey;

    // Step 2: 对消息进行哈希处理（以太坊使用 keccak256）
    const messageHash = keccak256(Buffer.from(message));

    // Step 3: 使用 ECDSA 私钥签名消息哈希
    const key = ec.keyFromPrivate(privateKey);
    const signature = key.sign(messageHash);

    // Step 4: 返回签名结果 (r, s, v)
    return {
        r: signature.r.toString("hex"), // 签名的 r 值
        s: signature.s.toString("hex"), // 签名的 s 值
        v: signature.recoveryParam, // 恢复值 v（以太坊常用）
    };
}
export async function verifySignature(evmKeypair, message, signature) {
    const publicKey = evmKeypair.publicKey;
    // 对消息进行哈希
    const messageHash = keccak256(Buffer.from(message));
    // 使用 ECDSA 公钥验证签名
    const key = ec.keyFromPublic(publicKey, "hex");
    return key.verify(messageHash, {
        r: signature.r,
        s: signature.s,
    });
}
