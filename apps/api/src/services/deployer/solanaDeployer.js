// apps/api/src/services/deployer/solanaDeployer.js

const {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, sendAndConfirmTransaction, clusterApiUrl,
} = require('@solana/web3.js')

const {
  createInitializeMintInstruction, createAssociatedTokenAccountInstruction,
  createMintToInstruction, createSetAuthorityInstruction,
  getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint,
  MINT_SIZE, TOKEN_PROGRAM_ID, AuthorityType,
} = require('@solana/spl-token')

function getConnection(network = 'mainnet') {
  const endpoints = {
    devnet:  clusterApiUrl('devnet'),
    mainnet: process.env.HELIUS_SOLANA_URL || clusterApiUrl('mainnet-beta'),
  }
  return new Connection(endpoints[network] || endpoints.mainnet, 'confirmed')
}

function getPlatformKeypair() {
  const key = process.env.SOLANA_PLATFORM_PRIVATE_KEY
  if (!key) throw new Error('SOLANA_PLATFORM_PRIVATE_KEY not set')
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(key)))
  } catch {
    const { decode } = require('bs58')
    return Keypair.fromSecretKey(decode(key))
  }
}

// ── Sanitize for Metaplex ─────────────────────────────────────────────────────
// Metaplex has strict limits: name ≤ 32 chars, symbol ≤ 10 chars, ASCII only.
// The "range end index 36 out of range" panic is caused by a symbol > 10 chars
// or containing non-ASCII characters.

function sanitizeForMetaplex(name, symbol) {
  const clean = str => str
    .replace(/[^\x20-\x7E]/g, '')  // ASCII printable only
    .replace(/['"<>&]/g, '')        // strip chars that break serialization
    .trim()

  return {
    name:   clean(name).slice(0, 32),
    symbol: clean(symbol).slice(0, 10),
  }
}

// ── Upload metadata JSON to Supabase Storage ──────────────────────────────────
async function uploadMetadataJson(mintAddress, { name, symbol, description, imageUrl }) {
  try {
    const { supabase } = require('../../lib/supabase')

    const { name: safeName, symbol: safeSymbol } = sanitizeForMetaplex(name, symbol)

    const metadataJson = JSON.stringify({
      name:         safeName,
      symbol:       safeSymbol,
      description:  description || `${safeName} — launched on 1launch`,
      image:        imageUrl || '',
      external_url: 'https://1launchos.xyz',
      attributes:   [],
    })

    const filePath = `${mintAddress}/metadata.json`
    const { error } = await supabase.storage
      .from('token-metadata')
      .upload(filePath, Buffer.from(metadataJson), { contentType: 'application/json', upsert: true })

    if (error) throw error

    const { data } = supabase.storage.from('token-metadata').getPublicUrl(filePath)
    console.log(`[Solana] Metadata JSON uploaded: ${data.publicUrl}`)
    return data.publicUrl
  } catch (err) {
    console.error('[Solana] Metadata JSON upload failed (non-fatal):', err.message)
    return ''
  }
}

// ── Attach Metaplex on-chain metadata ────────────────────────────────────────
async function attachMetadata(connection, payer, mintPublicKey, { name, symbol, uri }) {
  try {
    const { name: safeName, symbol: safeSymbol } = sanitizeForMetaplex(name, symbol)

    // Guard: symbol must be non-empty after sanitization
    if (!safeSymbol) throw new Error('Symbol is empty after sanitization')
    if (!safeName)   throw new Error('Name is empty after sanitization')

    const { createUmi }               = require('@metaplex-foundation/umi-bundle-defaults')
    const { mplTokenMetadata, createMetadataAccountV3 } = require('@metaplex-foundation/mpl-token-metadata')
    const { keypairIdentity, publicKey: umiPublicKey }  = require('@metaplex-foundation/umi')
    const { fromWeb3JsKeypair }        = require('@metaplex-foundation/umi-web3js-adapters')

    const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata())
    umi.use(keypairIdentity(fromWeb3JsKeypair(payer)))

    await createMetadataAccountV3(umi, {
      mint:            umiPublicKey(mintPublicKey.toBase58()),
      mintAuthority:   umi.identity,
      payer:           umi.identity,
      updateAuthority: umi.identity,
      data: {
        name:                 safeName,
        symbol:               safeSymbol,
        uri:                  uri || '',
        sellerFeeBasisPoints: 0,
        creators:   null,
        collection: null,
        uses:       null,
      },
      isMutable:         true,
      collectionDetails: null,
    }).sendAndConfirm(umi)

    console.log(`[Solana] Metadata attached: ${safeName} ($${safeSymbol})`)
  } catch (err) {
    console.error('[Solana] Metadata attach failed (non-fatal):', err.message)
  }
}

// ── Deploy SPL Token ──────────────────────────────────────────────────────────
async function deployTokenServerSide({
  name, symbol, totalSupply, ownerAddress,
  decimals = 9, disableMinting = true, network = 'mainnet',
  description, logoUrl,
}) {
  console.log(`[Solana] Creating token: ${name} ($${symbol}) for ${ownerAddress}`)

  const connection     = getConnection(network)
  const payer          = getPlatformKeypair()
  const ownerPublicKey = new PublicKey(ownerAddress)
  const mintKeypair    = Keypair.generate()
  const mintAddress    = mintKeypair.publicKey.toBase58()

  console.log(`[Solana] Mint address: ${mintAddress}`)

  const lamportsForMint = await getMinimumBalanceForRentExemptMint(connection)
  const ownerATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerPublicKey)

  const transaction = new Transaction()
  transaction.add(SystemProgram.createAccount({
    fromPubkey: payer.publicKey, newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE, lamports: lamportsForMint, programId: TOKEN_PROGRAM_ID,
  }))
  transaction.add(createInitializeMintInstruction(
    mintKeypair.publicKey, decimals, payer.publicKey, null, TOKEN_PROGRAM_ID
  ))
  transaction.add(createAssociatedTokenAccountInstruction(
    payer.publicKey, ownerATA, ownerPublicKey, mintKeypair.publicKey
  ))

  const mintAmount = BigInt(totalSupply) * BigInt(10 ** decimals)
  transaction.add(createMintToInstruction(mintKeypair.publicKey, ownerATA, payer.publicKey, mintAmount))

  if (disableMinting) {
    transaction.add(createSetAuthorityInstruction(
      mintKeypair.publicKey, payer.publicKey, AuthorityType.MintTokens, null
    ))
  }

  console.log(`[Solana] Sending transaction...`)
  const signature = await sendAndConfirmTransaction(
    connection, transaction, [payer, mintKeypair], { commitment: 'confirmed' }
  )
  console.log(`[Solana] Token created! Signature: ${signature}`)

  // Attach metadata after mint confirms — non-fatal if it fails
  const metadataUri = await uploadMetadataJson(mintAddress, { name, symbol, description, imageUrl: logoUrl })
  if (metadataUri) {
    await attachMetadata(connection, payer, mintKeypair.publicKey, { name, symbol, uri: metadataUri })
  }

  return {
    contractAddress: mintAddress,
    txHash:          signature,
    ownerATA:        ownerATA.toBase58(),
    explorerUrl:     `https://solscan.io/token/${mintAddress}`,
    txUrl:           `https://solscan.io/tx/${signature}`,
    network,
  }
}

async function verifyToken(mintAddress, network = 'mainnet') {
  try {
    const { getMint } = require('@solana/spl-token')
    const connection  = getConnection(network)
    const mint        = await getMint(connection, new PublicKey(mintAddress))
    return {
      valid: true, mintAddress,
      decimals: mint.decimals, supply: mint.supply.toString(),
      mintAuthority: mint.mintAuthority?.toBase58() || null,
      isFixedSupply: mint.mintAuthority === null,
    }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

module.exports = { deployTokenServerSide, verifyToken, getConnection }