import { isFalsy, setLengthLeft, toBuffer } from '@ethereumjs/util'
import { ripemd160 } from 'ethereum-cryptography/ripemd160'

import { ExecResult, OOGResult } from '../evm'
import { PrecompileInput } from './types'

export function precompile03(opts: PrecompileInput): ExecResult {
  if (isFalsy(opts.data)) throw new Error('opts.data missing but required')

  const data = opts.data

  let gasUsed = opts._common.param('gasPrices', 'ripemd160')
  gasUsed += opts._common.param('gasPrices', 'ripemd160Word') * BigInt(Math.ceil(data.length / 32))

  if (opts.gasLimit < gasUsed) {
    return OOGResult(opts.gasLimit)
  }

  return {
    executionGasUsed: gasUsed,
    returnValue: setLengthLeft(toBuffer(ripemd160(data)), 32),
  }
}
