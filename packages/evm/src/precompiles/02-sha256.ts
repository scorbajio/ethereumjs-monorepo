import { isFalsy, toBuffer } from '@ethereumjs/util'
import { sha256 } from 'ethereum-cryptography/sha256'

import { ExecResult, OOGResult } from '../evm'
import { PrecompileInput } from './types'

export function precompile02(opts: PrecompileInput): ExecResult {
  if (isFalsy(opts.data)) throw new Error('opts.data missing but required')

  const data = opts.data

  let gasUsed = opts._common.param('gasPrices', 'sha256')
  gasUsed += opts._common.param('gasPrices', 'sha256Word') * BigInt(Math.ceil(data.length / 32))

  if (opts.gasLimit < gasUsed) {
    return OOGResult(opts.gasLimit)
  }

  return {
    executionGasUsed: gasUsed,
    returnValue: toBuffer(sha256(data)),
  }
}
