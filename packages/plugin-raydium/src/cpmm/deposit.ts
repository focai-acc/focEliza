import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, Percent, getPdaPoolAuthority } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { isValidCpmm } from './utils'

export const deposit = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const poolId = '6rXSohG2esLJMzKZzpFr1BXUeXg8Cr5Gv3TwbuXbrwQq'
  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined

  if (raydium.cluster === 'devnet') {
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
  }

  console.log(123123444, poolInfo)

  const uiInputAmount = '0.0001'
  const inputAmount = new BN(new Decimal(uiInputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0))
  const slippage = new Percent(1, 100) // 1%
  const baseIn = true

  const { execute } = await raydium.cpmm.addLiquidity({
    poolInfo,
    poolKeys,
    inputAmount,
    slippage,
    baseIn,
    txVersion,
  })
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('pool deposited', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit()
}

deposit()
