export enum ERROR {
  OUT_OF_GAS = 'out of gas',
  CODESTORE_OUT_OF_GAS = 'code store out of gas',
  STACK_UNDERFLOW = 'stack underflow',
  STACK_OVERFLOW = 'stack overflow',
  INVALID_JUMP = 'invalid JUMP',
  INVALID_OPCODE = 'invalid opcode',
  OUT_OF_RANGE = 'value out of range',
  REVERT = 'revert',
  STATIC_STATE_CHANGE = 'static state change',
  INTERNAL_ERROR = 'internal error',
  CREATE_COLLISION = 'create collision',
  STOP = 'stop',
  REFUND_EXHAUSTED = 'refund exhausted',
  VALUE_OVERFLOW = 'value overflow',
  INSUFFICIENT_BALANCE = 'insufficient balance',
  INVALID_BEGINSUB = 'invalid BEGINSUB',
  INVALID_RETURNSUB = 'invalid RETURNSUB',
  INVALID_JUMPSUB = 'invalid JUMPSUB',
  INVALID_BYTECODE_RESULT = 'invalid bytecode deployed',
  INVALID_EOF_FORMAT = 'invalid EOF format',
  INITCODE_SIZE_VIOLATION = 'initcode exceeds max initcode size',

  AUTHCALL_UNSET = 'attempting to AUTHCALL without AUTH set',
  AUTHCALL_NONZERO_VALUEEXT = 'attempting to execute AUTHCALL with nonzero external value',
  AUTH_INVALID_S = 'invalid Signature: s-values greater than secp256k1n/2 are considered invalid',

  // BLS errors
  BLS_12_381_INVALID_INPUT_LENGTH = 'invalid input length',
  BLS_12_381_POINT_NOT_ON_CURVE = 'point not on curve',
  BLS_12_381_INPUT_EMPTY = 'input is empty',
  BLS_12_381_FP_NOT_IN_FIELD = 'fp point not in field',
}

export class EvmError {
  error: ERROR
  errorType: string

  constructor(error: ERROR) {
    this.error = error
    this.errorType = 'EvmError'
  }
}
