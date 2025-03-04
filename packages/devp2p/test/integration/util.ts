import { Chain, Common } from '@ethereumjs/common'
import { isTruthy } from '@ethereumjs/util'
import * as test from 'tape'

import { Capabilities, DPT, ETH, genPrivateKey, RLPx } from '../../src'
import * as testdata from '../testdata.json'

type Test = test.Test

export const delay = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export const localhost = '127.0.0.1'
export const basePort = 30306

export function getTestDPTs(numDPTs: number) {
  const dpts = []

  for (let i = 0; i < numDPTs; ++i) {
    const dpt = new DPT(genPrivateKey(), {
      endpoint: {
        address: localhost,
        udpPort: basePort + i,
        tcpPort: basePort + i,
      },
      timeout: 100,
    })
    dpt.bind(basePort + i)
    dpts.push(dpt)
  }
  return dpts
}

export function getTestDPTsWithDns(numDPTs: number) {
  const dpts = []

  for (let i = 0; i < numDPTs; ++i) {
    const dpt = new DPT(genPrivateKey(), {
      endpoint: {
        address: localhost,
        udpPort: basePort + i,
        tcpPort: basePort + i,
      },
      timeout: 1000,
      refreshInterval: 400,
      dnsNetworks: [testdata.dns.enrTree],
      shouldFindNeighbours: false,
      shouldGetDnsPeers: true,
    })
    dpt.bind(basePort + i)
    dpts.push(dpt)
  }
  return dpts
}

export function initTwoPeerDPTSetup() {
  const dpts = getTestDPTs(2)
  const peer = { address: localhost, udpPort: basePort + 1 }
  dpts[0].addPeer(peer)
  return dpts
}

export function destroyDPTs(dpts: DPT[]) {
  for (const dpt of dpts) dpt.destroy()
}

export function getTestRLPXs(
  numRLPXs: number,
  maxPeers: number = 10,
  capabilities?: Capabilities[],
  common?: Object | Common
) {
  const rlpxs = []
  if (typeof capabilities === 'undefined') {
    capabilities = [ETH.eth66, ETH.eth65, ETH.eth64, ETH.eth63, ETH.eth62]
  }
  if (!common) {
    common = new Common({ chain: Chain.Mainnet })
  }
  const dpts = getTestDPTs(numRLPXs)

  for (let i = 0; i < numRLPXs; ++i) {
    const rlpx = new RLPx(dpts[i].privateKey, {
      dpt: dpts[i],
      maxPeers: maxPeers,
      capabilities: capabilities,
      common: common.constructor === Array ? common[i] : (common as Common),
      listenPort: basePort + i,
    })
    rlpx.listen(basePort + i)
    rlpxs.push(rlpx)
  }
  return rlpxs
}

export function initTwoPeerRLPXSetup(maxPeers?: any, capabilities?: any, common?: Object | Common) {
  const rlpxs = getTestRLPXs(2, maxPeers, capabilities, common)
  const peer = { address: localhost, udpPort: basePort + 1, tcpPort: basePort + 1 }
  rlpxs[0]._dpt!.addPeer(peer)
  return rlpxs
}

/**
 * @param {Test} t
 * @param {Array} capabilities Capabilities
 * @param {Object} opts
 * @param {Dictionary} opts.status0 Status values requested by protocol
 * @param {Dictionary} opts.status1 Status values requested by protocol
 * @param {Function} opts.onOnceStatus0 (rlpxs, protocol) Optional handler function
 * @param {Function} opts.onPeerError0 (err, rlpxs) Optional handler function
 * @param {Function} opts.onPeerError1 (err, rlpxs) Optional handler function
 * @param {Function} opts.onOnMsg0 (rlpxs, protocol, code, payload) Optional handler function
 * @param {Function} opts.onOnMsg1 (rlpxs, protocol, code, payload) Optional handler function
 */
export function twoPeerMsgExchange(
  t: Test,
  opts: any,
  capabilities?: any,
  common?: Object | Common
) {
  const rlpxs = initTwoPeerRLPXSetup(null, capabilities, common)
  rlpxs[0].on('peer:added', function (peer: any) {
    const protocol = peer.getProtocols()[0]
    protocol.sendStatus(opts.status0) // (1 ->)

    protocol.once('status', () => {
      if (isTruthy(opts.onOnceStatus0)) opts.onOnceStatus0(rlpxs, protocol)
    }) // (-> 2)
    protocol.on('message', async (code: any, payload: any) => {
      if (isTruthy(opts.onOnMsg0)) opts.onOnMsg0(rlpxs, protocol, code, payload)
    })
    peer.on('error', (err: Error) => {
      if (isTruthy(opts.onPeerError0)) {
        opts.onPeerError0(err, rlpxs)
      } else {
        t.fail(`Unexpected peer 0 error: ${err}`)
      }
    }) // (-> 2)
  })

  rlpxs[1].on('peer:added', function (peer: any) {
    const protocol = peer.getProtocols()[0]
    protocol.on('message', async (code: any, payload: any) => {
      switch (code) {
        // Comfortability hack, use constants like devp2p.ETH.MESSAGE_CODES.STATUS
        // in production use
        case 0x00: // (-> 1)
          t.pass('should receive initial status message')
          protocol.sendStatus(opts.status1) // (2 ->)
          break
      }
      if (isTruthy(opts.onOnMsg1)) opts.onOnMsg1(rlpxs, protocol, code, payload)
    })
    peer.on('error', (err: any) => {
      if (isTruthy(opts.onPeerError1)) {
        opts.onPeerError1(err, rlpxs)
      } else {
        t.fail(`Unexpected peer 1 error: ${err}`)
      }
    })
  })
}

export function destroyRLPXs(rlpxs: any) {
  for (const rlpx of rlpxs) {
    // FIXME: Call destroy() on dpt instance from the rlpx.destroy() method
    rlpx._dpt.destroy()
    rlpx.destroy()
  }
}

export function twoPeerMsgExchange2(
  t: Test,
  opts: any,
  capabilities?: any,
  common?: Object | Common
) {
  const rlpxs = initTwoPeerRLPXSetup(null, capabilities, common)
  rlpxs[0].on('peer:added', function (peer: any) {
    const protocol = peer.getProtocols()[0]
    const v4Hello = {
      protocolVersion: 4,
      clientId: 'fakePeer',
      capabilities: [ETH.eth66],
      port: 30303,
      id: Buffer.alloc(12),
    }
    // Set peer's devp2p protocol version to 4
    protocol._peer._hello = v4Hello
    protocol.sendStatus(opts.status0)
    peer.on('error', (err: Error) => {
      t.fail(`Unexpected peer 0 error: ${err}`)
    })
  })

  rlpxs[1].on('peer:added', function (peer: any) {
    const protocol = peer.getProtocols()[0]
    protocol.once('message', async (code: any, _payload: any) => {
      switch (code) {
        case ETH.MESSAGE_CODES.STATUS:
          t.fail('should not have been able to process status message')
          break
      }
    })
    peer.once('error', (err: any) => {
      t.equal(
        err.message,
        'Invalid Snappy bitstream',
        'unable to process snappy compressed message'
      )
      t.end()
      destroyRLPXs(rlpxs)
    })
  })
}

/**
 * @param {Test} t
 * @param {Array} capabilities Capabilities
 * @param {Object} opts
 * @param {Function} opts.onSendMessage (rlpxs, protocol) Optional handler function
 * @param {Function} opts.onPeerError0 (err, rlpxs) Optional handler function
 * @param {Function} opts.onPeerError1 (err, rlpxs) Optional handler function
 * @param {Function} opts.onReceiveMessage (rlpxs, protocol, code, payload) Optional handler function
 */
export function twoPeerMsgExchange3(
  t: Test,
  opts: any,
  capabilities?: any,
  common?: Object | Common
) {
  const rlpxs = initTwoPeerRLPXSetup(null, capabilities, common)
  rlpxs[0].on('peer:added', function (peer: any) {
    const protocol = peer.getProtocols()[0]
    opts.sendMessage(rlpxs, protocol)
  })

  rlpxs[1].on('peer:added', function (peer: any) {
    const protocol = peer.getProtocols()[0]
    protocol.on('message', async (code: any, payload: any) => {
      opts.receiveMessage(rlpxs, protocol, code, payload)
    })
    peer.on('error', (err: any) => {
      if (isTruthy(opts.onPeerError1)) {
        opts.onPeerError1(err, rlpxs)
      } else {
        t.fail(`Unexpected peer 1 error: ${err}`)
      }
    })
  })
}
