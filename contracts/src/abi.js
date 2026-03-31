// ─────────────────────────────────────────────────────────────────────────────
// abi.js — Contract ABIs for 1launch
//
// ABI stands for Application Binary Interface.
// It's a JSON description of every function a contract exposes.
// The frontend/backend uses this to know how to encode function calls
// and decode return values when talking to the blockchain.
//
// You generate the ABI by compiling the Solidity. For now we hardcode it
// since we know the contracts. This will be updated if contracts change.
// ─────────────────────────────────────────────────────────────────────────────

// Factory ABI — only includes functions we actually call from the backend
const FACTORY_ABI = [
  // createToken: deploys a new ERC-20 token, payable (requires BNB fee)
  {
    type: 'function',
    name: 'createToken',
    stateMutability: 'payable',
    inputs: [
      { name: '_name',        type: 'string'  },
      { name: '_symbol',      type: 'string'  },
      { name: '_totalSupply', type: 'uint256' },
      { name: '_owner',       type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
  // deployFee: how much BNB to send with createToken
  {
    type: 'function',
    name: 'deployFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  // getTotalTokensCreated: how many tokens the factory has deployed
  {
    type: 'function',
    name: 'getTotalTokensCreated',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  // TokenCreated event — emitted when a new token is deployed
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { name: 'token',       type: 'address', indexed: true  },
      { name: 'creator',     type: 'address', indexed: true  },
      { name: 'name',        type: 'string',  indexed: false },
      { name: 'symbol',      type: 'string',  indexed: false },
      { name: 'totalSupply', type: 'uint256', indexed: false },
      { name: 'timestamp',   type: 'uint256', indexed: false },
    ],
  },
]

// Token ABI — standard ERC-20 functions
const TOKEN_ABI = [
  { type: 'function', name: 'name',        stateMutability: 'view', inputs: [], outputs: [{ type: 'string'  }] },
  { type: 'function', name: 'symbol',      stateMutability: 'view', inputs: [], outputs: [{ type: 'string'  }] },
  { type: 'function', name: 'decimals',    stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8'   }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf',   stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transfer',    stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'owner',       stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'renounced',   stateMutability: 'view', inputs: [], outputs: [{ type: 'bool'    }] },
  { type: 'function', name: 'renounceOwnership', stateMutability: 'nonpayable', inputs: [], outputs: [] },
]

module.exports = { FACTORY_ABI, TOKEN_ABI }
