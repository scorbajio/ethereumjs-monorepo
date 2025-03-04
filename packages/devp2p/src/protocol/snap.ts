import { RLP, utils } from '@ethereumjs/rlp'
import { isTruthy } from '@ethereumjs/util'
import * as snappy from 'snappyjs'

import { Peer } from '../rlpx/peer'
import { formatLogData } from '../util'
import { EthProtocol, Protocol, SendMethod } from './protocol'

export class SNAP extends Protocol {
  constructor(version: number, peer: Peer, send: SendMethod) {
    super(peer, send, EthProtocol.SNAP, version, SNAP.MESSAGE_CODES)
  }

  static snap = { name: 'snap', version: 1, length: 8, constructor: SNAP }

  _handleMessage(code: SNAP.MESSAGE_CODES, data: any) {
    const payload = RLP.decode(data) as unknown
    const messageName = this.getMsgPrefix(code)

    // Note, this needs optimization, see issue #1882
    const debugMsg = `Received ${messageName} message from ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}`
    const logData = formatLogData(data.toString('hex'), this._verbose)
    this.debug(messageName, `${debugMsg}: ${logData}`)

    switch (code) {
      case SNAP.MESSAGE_CODES.GET_ACCOUNT_RANGE:
      case SNAP.MESSAGE_CODES.ACCOUNT_RANGE:
      case SNAP.MESSAGE_CODES.GET_STORAGE_RANGES:
      case SNAP.MESSAGE_CODES.STORAGE_RANGES:
      case SNAP.MESSAGE_CODES.GET_BYTE_CODES:
      case SNAP.MESSAGE_CODES.BYTE_CODES:
      case SNAP.MESSAGE_CODES.GET_TRIE_NODES:
      case SNAP.MESSAGE_CODES.TRIE_NODES:
        break
      default:
        return
    }

    this.emit('message', code, payload)
  }

  sendStatus() {
    throw Error('SNAP prococol doesnot support status handshake')
  }

  /**
   *
   * @param code Message code
   * @param payload Payload (including reqId, e.g. `[1, [437000, 1, 0, 0]]`)
   */
  sendMessage(code: SNAP.MESSAGE_CODES, payload: any) {
    const messageName = this.getMsgPrefix(code)
    const logData = formatLogData(utils.bytesToHex(RLP.encode(payload)), this._verbose)
    const debugMsg = `Send ${messageName} message to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}: ${logData}`

    this.debug(messageName, debugMsg)

    switch (code) {
      case SNAP.MESSAGE_CODES.GET_ACCOUNT_RANGE:
      case SNAP.MESSAGE_CODES.ACCOUNT_RANGE:
      case SNAP.MESSAGE_CODES.GET_STORAGE_RANGES:
      case SNAP.MESSAGE_CODES.STORAGE_RANGES:
      case SNAP.MESSAGE_CODES.GET_BYTE_CODES:
      case SNAP.MESSAGE_CODES.BYTE_CODES:
      case SNAP.MESSAGE_CODES.GET_TRIE_NODES:
      case SNAP.MESSAGE_CODES.TRIE_NODES:
        break
      default:
        throw new Error(`Unknown code ${code}`)
    }

    payload = RLP.encode(payload)

    // Use snappy compression if peer supports DevP2P >=v5
    const protocolVersion = this._peer._hello?.protocolVersion
    if (isTruthy(protocolVersion) && protocolVersion >= 5) {
      payload = snappy.compress(payload)
    }

    this._send(code, payload)
  }

  getMsgPrefix(msgCode: SNAP.MESSAGE_CODES): string {
    return SNAP.MESSAGE_CODES[msgCode]
  }

  getVersion() {
    return this._version
  }
}

export namespace SNAP {
  export enum MESSAGE_CODES {
    // snap1
    GET_ACCOUNT_RANGE = 0x00,
    ACCOUNT_RANGE = 0x01,
    GET_STORAGE_RANGES = 0x02,
    STORAGE_RANGES = 0x03,
    GET_BYTE_CODES = 0x04,
    BYTE_CODES = 0x05,
    GET_TRIE_NODES = 0x06,
    TRIE_NODES = 0x07,
  }
}
