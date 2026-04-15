// update-factory-fee.js
require('dotenv').config({ path: './apps/api/.env' })
const { ethers } = require('ethers')

const FACTORY_ADDRESS = '0xa10c6Dc39eEaD1288eF008B44D1e416e14E45eb5'
const NEW_FEE_BNB     = '0.0033'

// Try multiple RPCs in order
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://rpc.ankr.com/bsc',
]

const FACTORY_ABI = [
  { type: 'function', name: 'setDeployFee', inputs: [{ name: '_fee', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'deployFee', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
]

async function getProvider() {
  for (const rpc of RPCS) {
    try {
      console.log(`Trying ${rpc}...`)
      const provider = new ethers.JsonRpcProvider(rpc)
      await provider.getBlockNumber()
      console.log(`Connected to ${rpc}`)
      return provider
    } catch {
      console.log(`Failed, trying next...`)
    }
  }
  throw new Error('All RPCs failed')
}

async function main() {
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY
  if (!privateKey) { console.error('PLATFORM_WALLET_PRIVATE_KEY not set'); process.exit(1) }

  const provider = await getProvider()
  const signer   = new ethers.Wallet(privateKey, provider)
  const factory  = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)

  const currentFee = await factory.deployFee()
  console.log(`Current fee: ${ethers.formatEther(currentFee)} BNB`)

  const newFee = ethers.parseEther(NEW_FEE_BNB)
  console.log(`Setting new fee: ${NEW_FEE_BNB} BNB (~$2)`)

  const tx = await factory.setDeployFee(newFee)
  console.log(`Tx: ${tx.hash}`)
  console.log('Waiting for confirmation...')
  await tx.wait(2)

  const updatedFee = await factory.deployFee()
  console.log(`Done. New fee: ${ethers.formatEther(updatedFee)} BNB`)
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })