// ─────────────────────────────────────────────────────────────────────────────
// solanaDeployer.js
//
// Handles Solana token creation using the SPL Token Program.
//
// How Solana tokens work (vs BSC):
//
// On BSC: You deploy a smart contract. The contract IS the token.
// On Solana: There's one global "Token Program" that manages all tokens.
//   You create a "Mint Account" — a special account that represents your token.
//   The mint account stores: decimals, total supply, who can mint more.
//   Token balances live in separate "Associated Token Accounts" (ATAs).
//
// Key concepts:
//   Mint:     The token itself. Has an address (mint address = contract address equivalent)
//   ATA:      Associated Token Account — where a wallet holds a specific token
//   Lamports: Solana's smallest unit (like wei on ETH). 1 SOL = 1,000,000,000 lamports
//
// Creating a token on Solana:
//   1. Generate a new keypair — this becomes the mint address
//   2. Create the mint account (allocate space + rent)
//   3. Initialize it (set decimals, mint authority)
//   4. Create an ATA for the owner
//   5. Mint the total supply into the owner's ATA
//   6. (Optional) Disable future minting by removing mint authority
//
// ─────────────────────────────────────────────────────────────────────────────

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} = require('@solana/web3.js')

const {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  AuthorityType,
} = require('@solana/spl-token')

// ── Connection setup ──────────────────────────────────────────────────────────

function getConnection(network = 'devnet') {
  const endpoints = {
    devnet:  clusterApiUrl('devnet'),
    mainnet: process.env.HELIUS_SOLANA_URL || clusterApiUrl('mainnet-beta'),
  }
  return new Connection(endpoints[network] || endpoints.devnet, 'confirmed')
}

// ── Platform wallet (payer) ───────────────────────────────────────────────────
// For server-side testing only. In production the user's wallet pays.
function getPlatformKeypair() {
  const key = process.env.SOLANA_PLATFORM_PRIVATE_KEY
  if (!key) throw new Error('SOLANA_PLATFORM_PRIVATE_KEY not set')

  try {
    const parsed = JSON.parse(key)
    return Keypair.fromSecretKey(Uint8Array.from(parsed))
  } catch {
    const bs58 = require('bs58')
    const decoder = bs58.default?.decode ?? bs58.decode
    return Keypair.fromSecretKey(decoder(key))
  }
}
// ── Deploy SPL Token ──────────────────────────────────────────────────────────

async function deployTokenServerSide({
  name,
  symbol,
  totalSupply,
  ownerAddress,
  decimals = 9,        // Solana standard is 9 decimals (vs 18 on EVM)
  disableMinting = true, // Remove mint authority after deploy (prevents inflation)
  network = 'devnet',
}) {
  console.log(`[Solana] Creating token: ${name} ($${symbol}) for ${ownerAddress}`)

  const connection = getConnection(network)
  const payer = getPlatformKeypair()

  // The owner who will receive all tokens
  const ownerPublicKey = new PublicKey(ownerAddress)

  // ── Step 1: Generate a new keypair for the mint ───────────────────────────
  // This keypair's public key becomes the token's "contract address" equivalent.
  // The private key is only needed to sign the initialization transaction.
  const mintKeypair = Keypair.generate()
  console.log(`[Solana] Mint address: ${mintKeypair.publicKey.toBase58()}`)

  // ── Step 2: Calculate rent-exempt balance ─────────────────────────────────
  // On Solana, accounts need to hold a minimum amount of SOL called "rent"
  // to exist on-chain. This calculates how much SOL the mint account needs.
  const lamportsForMint = await getMinimumBalanceForRentExemptMint(connection)

  // ── Step 3: Find the Associated Token Account address ────────────────────
  // The ATA is where the owner will hold this token.
  // It's deterministically derived from (owner + mint) — no randomness.
  const ownerATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    ownerPublicKey
  )

  // ── Step 4: Build the transaction ────────────────────────────────────────
  // Solana transactions are atomic — all instructions succeed or all fail.
  // We bundle everything into one transaction for efficiency.

  const transaction = new Transaction()

  // Instruction 1: Create the mint account
  // This allocates space on-chain and sends it rent-exempt SOL
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey:     payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space:          MINT_SIZE,         // How many bytes the mint account needs
      lamports:       lamportsForMint,
      programId:      TOKEN_PROGRAM_ID,  // This account belongs to the Token Program
    })
  )

  // Instruction 2: Initialize the mint
  // Sets decimals, who can mint more tokens (mintAuthority),
  // and who can freeze accounts (freezeAuthority = null = nobody)
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,  // The mint account
      decimals,               // 9 for Solana standard
      payer.publicKey,        // Mint authority (will be removed if disableMinting)
      null,                   // Freeze authority — null means nobody can freeze
      TOKEN_PROGRAM_ID
    )
  )

  // Instruction 3: Create the owner's Associated Token Account
  // This is where the tokens will live after minting
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,    // Who pays for the account creation
      ownerATA,           // The ATA address (derived, not random)
      ownerPublicKey,     // Owner of this token account
      mintKeypair.publicKey  // Which token this account holds
    )
  )

  // Instruction 4: Mint tokens to the owner's ATA
  // Convert human supply to token units (account for decimals)
  // e.g. 1,000,000,000 tokens × 10^9 = 1,000,000,000,000,000,000
  const mintAmount = BigInt(totalSupply) * BigInt(10 ** decimals)

  transaction.add(
    createMintToInstruction(
      mintKeypair.publicKey,  // The mint
      ownerATA,               // Destination (owner's token account)
      payer.publicKey,        // Mint authority
      mintAmount              // Amount in base units
    )
  )

  // Instruction 5 (optional): Remove mint authority
  // This means nobody can ever mint more of this token — fixed supply.
  // Degens love this — it proves no inflation is possible.
  if (disableMinting) {
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,   // The mint
        payer.publicKey,         // Current authority
        AuthorityType.MintTokens, // What authority to remove
        null                     // New authority = null = nobody
      )
    )
  }

  // ── Step 5: Send and confirm ──────────────────────────────────────────────
  // signers[0] = payer (pays fees, signs everything)
  // signers[1] = mintKeypair (signs its own creation)
  console.log(`[Solana] Sending transaction...`)

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair],
    { commitment: 'confirmed' }
  )

  console.log(`[Solana] Token created! Signature: ${signature}`)

  const explorerBase = network === 'mainnet'
    ? 'https://solscan.io'
    : 'https://solscan.io/?cluster=devnet'

  return {
    contractAddress: mintKeypair.publicKey.toBase58(), // "Mint address" on Solana
    txHash:          signature,
    ownerATA:        ownerATA.toBase58(),
    explorerUrl:     `https://solscan.io/token/${mintKeypair.publicKey.toBase58()}${network !== 'mainnet' ? '?cluster=devnet' : ''}`,
    txUrl:           `https://solscan.io/tx/${signature}${network !== 'mainnet' ? '?cluster=devnet' : ''}`,
    network,
  }
}

// ── Verify token on-chain ─────────────────────────────────────────────────────

async function verifyToken(mintAddress, network = 'devnet') {
  try {
    const { getMint } = require('@solana/spl-token')
    const connection = getConnection(network)
    const mint = await getMint(connection, new PublicKey(mintAddress))

    return {
      valid: true,
      mintAddress,
      decimals: mint.decimals,
      supply: mint.supply.toString(),
      mintAuthority: mint.mintAuthority?.toBase58() || null,
      isFixedSupply: mint.mintAuthority === null,
    }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

module.exports = { deployTokenServerSide, verifyToken, getConnection }
