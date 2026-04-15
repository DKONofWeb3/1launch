// ─────────────────────────────────────────────────────────────────────────────
// solanaDeployer.js
//
// Handles Solana token creation using the SPL Token Program + Metaplex metadata.
//
// Fixes applied:
//   1. On-chain metadata via Metaplex — so Solscan shows real name/ticker/logo
//   2. contractAddress is always returned as toBase58() (correct case, never lowercased)
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

function getConnection(network = 'mainnet') {
  const endpoints = {
    devnet:  clusterApiUrl('devnet'),
    mainnet: process.env.HELIUS_SOLANA_URL || clusterApiUrl('mainnet-beta'),
  }
  return new Connection(endpoints[network] || endpoints.mainnet, 'confirmed')
}

// ── Platform wallet (payer) ───────────────────────────────────────────────────

function getPlatformKeypair() {
  const key = process.env.SOLANA_PLATFORM_PRIVATE_KEY
  if (!key) throw new Error('SOLANA_PLATFORM_PRIVATE_KEY not set')
  try {
    const parsed = JSON.parse(key)
    return Keypair.fromSecretKey(Uint8Array.from(parsed))
  } catch {
    const { decode } = require('bs58')
    return Keypair.fromSecretKey(decode(key))
  }
}

// ── Attach Metaplex on-chain metadata ────────────────────────────────────────
// This is what makes Solscan (and all explorers) show the real name, ticker,
// and logo instead of just "SPL Token".

async function attachMetadata(connection, payer, mintPublicKey, { name, symbol, uri }) {
  try {
    const { createUmi }               = require('@metaplex-foundation/umi-bundle-defaults')
    const { mplTokenMetadata, createMetadataAccountV3 } = require('@metaplex-foundation/mpl-token-metadata')
    const { keypairIdentity, publicKey: umiPublicKey } = require('@metaplex-foundation/umi')
    const { fromWeb3JsKeypair }        = require('@metaplex-foundation/umi-web3js-adapters')

    const rpcEndpoint = connection.rpcEndpoint
    const umi = createUmi(rpcEndpoint).use(mplTokenMetadata())
    umi.use(keypairIdentity(fromWeb3JsKeypair(payer)))

    const mint = umiPublicKey(mintPublicKey.toBase58())

    await createMetadataAccountV3(umi, {
      mint,
      mintAuthority:   umi.identity,
      payer:           umi.identity,
      updateAuthority: umi.identity,
      data: {
        name,
        symbol,
        uri,                      // publicly accessible JSON with image/description
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable:         true,
      collectionDetails: null,
    }).sendAndConfirm(umi)

    console.log(`[Solana] Metadata attached: ${name} ($${symbol})`)
  } catch (err) {
    // Don't fail the whole deploy if metadata fails — token is already created.
    // Metadata can be added manually later via a separate transaction.
    console.error('[Solana] Metadata attach failed (non-fatal):', err.message)
  }
}

// ── Build and upload metadata JSON ───────────────────────────────────────────
// Uploads a metadata.json to Supabase Storage so Metaplex has a URI to point to.

async function uploadMetadataJson(mintAddress, { name, symbol, description, imageUrl }) {
  try {
    const { supabase } = require('../../lib/supabase')

    const metadataJson = JSON.stringify({
      name,
      symbol,
      description: description || `${name} — launched on 1launch`,
      image:       imageUrl || '',
      external_url: 'https://1launch.xyz',
      attributes:  [],
    })

    const filePath = `${mintAddress}/metadata.json`

    const { error } = await supabase.storage
      .from('token-metadata')
      .upload(filePath, Buffer.from(metadataJson), {
        contentType: 'application/json',
        upsert:      true,
      })

    if (error) throw error

    const { data } = supabase.storage
      .from('token-metadata')
      .getPublicUrl(filePath)

    console.log(`[Solana] Metadata JSON uploaded: ${data.publicUrl}`)
    return data.publicUrl
  } catch (err) {
    console.error('[Solana] Metadata JSON upload failed (non-fatal):', err.message)
    return '' // Fall back to empty URI — token still deploys
  }
}

// ── Deploy SPL Token ──────────────────────────────────────────────────────────

async function deployTokenServerSide({
  name,
  symbol,
  totalSupply,
  ownerAddress,
  decimals = 9,
  disableMinting = true,
  network = 'mainnet',
  // Optional metadata fields (from token_draft)
  description,
  logoUrl,
}) {
  console.log(`[Solana] Creating token: ${name} ($${symbol}) for ${ownerAddress}`)

  const connection    = getConnection(network)
  const payer         = getPlatformKeypair()
  const ownerPublicKey = new PublicKey(ownerAddress)

  // Step 1: Generate mint keypair
  const mintKeypair = Keypair.generate()
  const mintAddress = mintKeypair.publicKey.toBase58() // ← ALWAYS use toBase58(), never toLowerCase()
  console.log(`[Solana] Mint address: ${mintAddress}`)

  // Step 2: Rent
  const lamportsForMint = await getMinimumBalanceForRentExemptMint(connection)

  // Step 3: Owner ATA
  const ownerATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    ownerPublicKey
  )

  // Step 4: Build transaction
  const transaction = new Transaction()

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey:       payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space:            MINT_SIZE,
      lamports:         lamportsForMint,
      programId:        TOKEN_PROGRAM_ID,
    })
  )

  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  )

  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ownerATA,
      ownerPublicKey,
      mintKeypair.publicKey
    )
  )

  const mintAmount = BigInt(totalSupply) * BigInt(10 ** decimals)

  transaction.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      ownerATA,
      payer.publicKey,
      mintAmount
    )
  )

  if (disableMinting) {
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        payer.publicKey,
        AuthorityType.MintTokens,
        null
      )
    )
  }

  // Step 5: Send
  console.log(`[Solana] Sending transaction...`)

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair],
    { commitment: 'confirmed' }
  )

  console.log(`[Solana] Token created! Signature: ${signature}`)

  // Step 6: Upload metadata JSON to Supabase, then attach on-chain via Metaplex
  // Do this AFTER the mint transaction confirms so the mint account exists.
  const metadataUri = await uploadMetadataJson(mintAddress, {
    name,
    symbol,
    description,
    imageUrl: logoUrl,
  })

  if (metadataUri) {
    await attachMetadata(connection, payer, mintKeypair.publicKey, {
      name,
      symbol,
      uri: metadataUri,
    })
  }

  return {
    contractAddress: mintAddress,           // ← correct base58 casing, NEVER lowercased
    txHash:          signature,
    ownerATA:        ownerATA.toBase58(),
    explorerUrl:     `https://solscan.io/token/${mintAddress}`,
    txUrl:           `https://solscan.io/tx/${signature}`,
    network,
  }
}

// ── Verify token on-chain ─────────────────────────────────────────────────────

async function verifyToken(mintAddress, network = 'mainnet') {
  try {
    const { getMint } = require('@solana/spl-token')
    const connection  = getConnection(network)
    const mint        = await getMint(connection, new PublicKey(mintAddress))

    return {
      valid:         true,
      mintAddress,
      decimals:      mint.decimals,
      supply:        mint.supply.toString(),
      mintAuthority: mint.mintAuthority?.toBase58() || null,
      isFixedSupply: mint.mintAuthority === null,
    }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

module.exports = { deployTokenServerSide, verifyToken, getConnection }