// compile-and-deploy.js
// Run from project root: node compile-and-deploy.js

const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

// ── Step 1: Compile ───────────────────────────────────────────────────────────
console.log('Compiling contracts...')

const contractsDir = path.join(__dirname, 'contracts', 'src')
const factoryPath  = path.join(contractsDir, 'OnelaunchFactory.sol')
const tokenPath    = path.join(contractsDir, 'OnelaunchToken.sol')

// Install solc if needed
try { require.resolve('solc') } catch {
  console.log('Installing solc...')
  execSync('npm install solc@0.8.20', { stdio: 'inherit' })
}

const solc    = require('solc')
const factory = fs.readFileSync(factoryPath, 'utf8')
const token   = fs.readFileSync(tokenPath, 'utf8')

const input = {
  language: 'Solidity',
  sources: {
    'OnelaunchFactory.sol': { content: factory },
    'OnelaunchToken.sol':   { content: token },
  },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    optimizer: { enabled: true, runs: 200 },
  },
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))
const errors = (output.errors || []).filter(e => e.severity === 'error')
if (errors.length) {
  console.error('Compilation failed:')
  errors.forEach(e => console.error(e.message))
  process.exit(1)
}

const factoryContract = output.contracts['OnelaunchFactory.sol']['OnelaunchFactory']
const tokenContract   = output.contracts['OnelaunchToken.sol']['OnelaunchToken']

const factoryBytecode = factoryContract.evm.bytecode.object
const tokenBytecode   = tokenContract.evm.bytecode.object

console.log('Compilation successful.')
console.log('Factory bytecode length:', factoryBytecode.length, 'chars')

// ── Step 2: Deploy ────────────────────────────────────────────────────────────
console.log('\nDeploying to BSC mainnet...')

require('dotenv').config({ path: 'apps/api/.env' })

const { ethers } = require('ethers')

const RPC         = 'https://bsc-dataseed.bnbchain.org'
const PRIVATE_KEY = process.env.PLATFORM_WALLET_PRIVATE_KEY
const WALLET_ADDR = process.env.PLATFORM_WALLET_ADDRESS

if (!PRIVATE_KEY) {
  console.error('PLATFORM_WALLET_PRIVATE_KEY not set in apps/api/.env')
  process.exit(1)
}

// $5 deploy fee — at ~$600/BNB = 0.0083 BNB
const DEPLOY_FEE_WEI = '8300000000000000' // 0.0083 BNB ≈ $5

;(async () => {
  const provider = new ethers.JsonRpcProvider(RPC)
  const signer   = new ethers.Wallet(PRIVATE_KEY, provider)

  const balance = await provider.getBalance(signer.address)
  console.log('Wallet:', signer.address)
  console.log('Balance:', ethers.formatEther(balance), 'BNB')

  if (balance < ethers.parseEther('0.02')) {
    console.error('Not enough BNB. Need at least 0.02 BNB for gas.')
    process.exit(1)
  }

  const FACTORY_ABI = factoryContract.abi
  const cf = new ethers.ContractFactory(FACTORY_ABI, factoryBytecode, signer)

  console.log('Sending deploy transaction...')
  const contract = await cf.deploy(WALLET_ADDR, DEPLOY_FEE_WEI)
  console.log('Waiting for confirmation...')
  await contract.waitForDeployment()

  const factoryAddress = await contract.getAddress()

  console.log('\n========================================')
  console.log('Factory deployed at:', factoryAddress)
  console.log('========================================')
  console.log('\nAdd this to Render environment variables:')
  console.log('BSC_MAINNET_FACTORY_ADDRESS=' + factoryAddress)
  console.log('\nAlso add this (needed for token deployments):')
  console.log('FACTORY_BYTECODE=' + tokenBytecode)
  console.log('\nTx:', contract.deploymentTransaction()?.hash)
})()