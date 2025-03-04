import * as tape from 'tape'

import { EVM } from '../src/evm'
import { InterpreterStep, RunState } from '../src/interpreter'
import { AddOpcode } from '../src/types'
import { getEEI } from './utils'

tape('VM: custom opcodes', (t) => {
  const fee = 333
  const logicFee = BigInt(33)
  const totalFee = BigInt(fee) + logicFee
  const stackPush = BigInt(1)

  const testOpcode: AddOpcode = {
    opcode: 0x21,
    opcodeName: 'TEST',
    baseFee: fee,
    gasFunction: function (runState: RunState, gas: bigint) {
      return gas + logicFee
    },
    logicFunction: function (runState: RunState) {
      runState.stack.push(BigInt(stackPush))
    },
  }

  t.test('should add custom opcodes to the EVM', async (st) => {
    const evm = await EVM.create({
      customOpcodes: [testOpcode],
      eei: await getEEI(),
    })
    const gas = 123456
    let correctOpcodeName = false
    evm.on('step', (e: InterpreterStep) => {
      if (e.pc === 0) {
        correctOpcodeName = e.opcode.name === testOpcode.opcodeName
      }
    })
    const res = await evm.runCode({
      code: Buffer.from('21', 'hex'),
      gasLimit: BigInt(gas),
    })
    st.ok(res.executionGasUsed === totalFee, 'succesfully charged correct gas')
    st.ok(res.runState!.stack._store[0] === stackPush, 'succesfully ran opcode logic')
    st.ok(correctOpcodeName, 'succesfully set opcode name')
  })

  t.test('should delete opcodes from the EVM', async (st) => {
    const evm = await EVM.create({
      customOpcodes: [{ opcode: 0x20 }], // deletes KECCAK opcode
      eei: await getEEI(),
    })
    const gas = BigInt(123456)
    const res = await evm.runCode({
      code: Buffer.from('20', 'hex'),
      gasLimit: BigInt(gas),
    })
    st.ok(res.executionGasUsed === gas, 'succesfully deleted opcode')
  })

  t.test('should not override default opcodes', async (st) => {
    // This test ensures that always the original opcode map is used
    // Thus, each time you recreate a EVM, it is in a clean state
    const evm = await EVM.create({
      customOpcodes: [{ opcode: 0x01 }], // deletes ADD opcode
      eei: await getEEI(),
    })
    const gas = BigInt(123456)
    const res = await evm.runCode({
      code: Buffer.from('01', 'hex'),
      gasLimit: BigInt(gas),
    })
    st.ok(res.executionGasUsed === gas, 'succesfully deleted opcode')

    const eei = await getEEI()
    const evmDefault = await EVM.create({ eei })

    // PUSH 04
    // PUSH 01
    // ADD      // Adds 4 and 1 -> stack is now [5]
    // PUSH 00
    // MSTORE  // Store 5 (this is a bytes32, so 31 0 bytes and then 1 byte with value 5) at memory position 0
    // PUSH 01 // RETURNDATA length
    // PUSH 1F // RETURNDATA offset
    // RETURN  // Returns 0x05
    const result = await evmDefault.runCode!({
      code: Buffer.from('60046001016000526001601FF3', 'hex'),
      gasLimit: BigInt(gas),
    })
    st.ok(result.returnValue.equals(Buffer.from('05', 'hex')))
  })

  t.test('should override opcodes in the EVM', async (st) => {
    testOpcode.opcode = 0x20 // Overrides KECCAK
    const evm = await EVM.create({
      customOpcodes: [testOpcode],
      eei: await getEEI(),
    })
    const gas = 123456
    const res = await evm.runCode({
      code: Buffer.from('20', 'hex'),
      gasLimit: BigInt(gas),
    })
    st.ok(res.executionGasUsed === totalFee, 'succesfully charged correct gas')
    st.ok(res.runState!.stack._store[0] === stackPush, 'succesfully ran opcode logic')
  })

  t.test('should pass the correct EVM options when copying the EVM', async (st) => {
    const fee = 333
    const stackPush = BigInt(1)

    const testOpcode: AddOpcode = {
      opcode: 0x21,
      opcodeName: 'TEST',
      baseFee: fee,
      logicFunction: function (runState: RunState) {
        runState.stack.push(BigInt(stackPush))
      },
    }

    const evm = await EVM.create({
      customOpcodes: [testOpcode],
      eei: await getEEI(),
    })
    const evmCopy = evm.copy()

    st.deepEqual(
      (evmCopy as any)._customOpcodes,
      (evmCopy as any)._customOpcodes,
      'evm.copy() successfully copied customOpcodes option'
    )
  })
})
