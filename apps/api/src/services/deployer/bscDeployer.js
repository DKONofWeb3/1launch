// ─────────────────────────────────────────────────────────────────────────────
// bscDeployer.js
//
// This service handles all BSC (BNB Smart Chain) token deployment logic.
//
// How it works:
// 1. User clicks Deploy in the UI
// 2. Frontend sends a deploy request to our API with the draft ID
// 3. This service:
//    a. Connects to BSC via RPC
//    b. Calls createToken() on our deployed Factory contract
//    c. Waits for the transaction to be confirmed on-chain
//    d. Returns the new token's contract address
//
// IMPORTANT: The platform wallet's private key lives in .env
// Never commit it. Never log it. Never expose it to the frontend.
// ─────────────────────────────────────────────────────────────────────────────

const { ethers } = require('ethers')
const { FACTORY_ABI } = require('../../../../../contracts/src/abi')

// ── Chain config ──────────────────────────────────────────────────────────────

const BSC_CHAINS = {
  testnet: {
    rpc: process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    explorerUrl: 'https://testnet.bscscan.com',
    factoryAddress: process.env.BSC_TESTNET_FACTORY_ADDRESS || '',
  },
  mainnet: {
    rpc: process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org',
    chainId: 56,
    explorerUrl: 'https://bscscan.com',
    factoryAddress: process.env.BSC_MAINNET_FACTORY_ADDRESS || '',
  },
}

function getChainConfig(network = 'testnet') {
  return BSC_CHAINS[network] || BSC_CHAINS.testnet
}

// ── Provider + Signer setup ───────────────────────────────────────────────────
// Provider: read-only connection to the blockchain
// Signer: a wallet that can sign and send transactions

function getProvider(network = 'testnet') {
  const config = getChainConfig(network)
  return new ethers.JsonRpcProvider(config.rpc)
}

function getPlatformSigner(network = 'testnet') {
  // The platform private key is used to:
  // 1. Deploy the factory (one time only)
  // 2. NOT used for user token deployments — users sign those themselves
  //    via MetaMask on the frontend (Phase 3 frontend integration)
  const provider = getProvider(network)
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('PLATFORM_WALLET_PRIVATE_KEY not set in .env')
  }

  return new ethers.Wallet(privateKey, provider)
}

// ── Deploy Factory (run once) ─────────────────────────────────────────────────
// This deploys the OnelaunchFactory contract to BSC testnet.
// You only do this ONCE. After that, save the factory address in .env.

async function deployFactory(network = 'testnet') {
  console.log(`[BSC] Deploying factory to ${network}...`)

  const signer = getPlatformSigner(network)
  const config = getChainConfig(network)

  // Deploy fee: 0.05 BNB for testnet (cheap for testing)
  // For mainnet: ~0.025 BNB (~$15 at $600/BNB)
  const deployFeeWei = ethers.parseEther(network === 'mainnet' ? '0.025' : '0.001')

  // Factory bytecode — this is the compiled contract
  // In production you'd import this from a build artifact (Hardhat/Foundry output)
  // For now we include a placeholder — replace with actual compiled bytecode
  // after running: npx hardhat compile
  const FACTORY_BYTECODE = process.env.FACTORY_BYTECODE || ''

  if (!FACTORY_BYTECODE) {
    throw new Error('FACTORY_BYTECODE not set. Compile contracts first with: npx hardhat compile')
  }

  const factory = new ethers.ContractFactory(FACTORY_ABI, FACTORY_BYTECODE, signer)
  const contract = await factory.deploy(signer.address, deployFeeWei)

  console.log(`[BSC] Factory deploy tx: ${contract.deploymentTransaction().hash}`)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log(`[BSC] Factory deployed at: ${address}`)
  console.log(`[BSC] Set BSC_${network.toUpperCase()}_FACTORY_ADDRESS=${address} in .env`)

  return address
}

// ── Get factory contract instance ─────────────────────────────────────────────

function getFactory(network = 'testnet', signerOrProvider = null) {
  const config = getChainConfig(network)

  if (!config.factoryAddress) {
    throw new Error(`Factory not deployed on ${network}. Run deployFactory() first.`)
  }

  const connection = signerOrProvider || getProvider(network)
  return new ethers.Contract(config.factoryAddress, FACTORY_ABI, connection)
}

// ── Server-side deploy (platform pays gas) ────────────────────────────────────
// This is ONLY used for testing. In production, the USER pays gas via MetaMask.
// See deployTokenFromFrontend() comment below.

async function deployTokenServerSide({
  name,
  symbol,
  totalSupply,
  ownerAddress,
  network = 'testnet',
}) {
  console.log(`[BSC] Deploying token: ${name} ($${symbol}) for ${ownerAddress}`)

  const signer = getPlatformSigner(network)
  const factory = getFactory(network, signer)

  // Get current deploy fee from the contract
  const deployFee = await factory.deployFee()
  console.log(`[BSC] Deploy fee: ${ethers.formatEther(deployFee)} BNB`)

  // Call createToken on the factory, sending the required BNB fee
  const tx = await factory.createToken(
    name,
    symbol,
    BigInt(totalSupply),
    ownerAddress,
    { value: deployFee }
  )

  console.log(`[BSC] Transaction sent: ${tx.hash}`)

  // Wait for 2 block confirmations before considering it final
  const receipt = await tx.wait(2)
  console.log(`[BSC] Confirmed in block: ${receipt.blockNumber}`)

  // Parse the TokenCreated event from the receipt to get the token address
  const factoryInterface = new ethers.Interface(FACTORY_ABI)
  let tokenAddress = null

  for (const log of receipt.logs) {
    try {
      const parsed = factoryInterface.parseLog(log)
      if (parsed?.name === 'TokenCreated') {
        tokenAddress = parsed.args.token
        break
      }
    } catch { /* not our event */ }
  }

  if (!tokenAddress) {
    throw new Error('Could not find TokenCreated event in receipt')
  }

  const config = getChainConfig(network)

  return {
    contractAddress: tokenAddress,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: `${config.explorerUrl}/token/${tokenAddress}`,
    txUrl: `${config.explorerUrl}/tx/${tx.hash}`,
    network,
  }
}

// ── Frontend deploy (user pays gas via MetaMask) ───────────────────────────────
// In Phase 3 frontend integration, the user signs the transaction in MetaMask.
// The frontend calls the factory directly using ethers.js + their wallet.
// The backend only stores the result — it doesn't touch the private key.
//
// Frontend code (for reference, goes in the Next.js deploy page):
//
// const provider = new ethers.BrowserProvider(window.ethereum)
// const signer = await provider.getSigner()
// const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)
// const deployFee = await factory.deployFee()
// const tx = await factory.createToken(name, symbol, supply, signer.address, { value: deployFee })
// const receipt = await tx.wait(2)
// // Parse TokenCreated event to get token address
// // POST to /api/tokens/record with { txHash, contractAddress, chain: 'bsc' }

// ── Verify token exists on-chain ──────────────────────────────────────────────

async function verifyToken(tokenAddress, network = 'testnet') {
  try {
    const { TOKEN_ABI } = require('../../../../../contracts/src/abi')
    const provider = getProvider(network)
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)

    const [name, symbol, totalSupply, owner] = await Promise.all([
      token.name(),
      token.symbol(),
      token.totalSupply(),
      token.owner(),
    ])

    return {
      valid: true,
      name,
      symbol,
      totalSupply: ethers.formatUnits(totalSupply, 18),
      owner,
    }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

module.exports = {
  deployFactory,
  deployTokenServerSide,
  verifyToken,
  getFactory,
  getProvider,
  getChainConfig,
}
