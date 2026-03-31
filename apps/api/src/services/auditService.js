const axios = require('axios')

// GoPlus Security API — free, no key needed for basic tier
// Docs: https://docs.gopluslabs.io/reference/api-reference

const CHAIN_IDS = {
  bsc:    '56',
  solana: 'solana',
}

async function runAuditScan(contractAddress, chain) {
  try {
    const chainId = CHAIN_IDS[chain]
    if (!chainId) throw new Error(`Unsupported chain: ${chain}`)

    let data

    if (chain === 'solana') {
      // GoPlus Solana token security endpoint
      const res = await axios.get(
        `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${contractAddress}`,
        { timeout: 15000 }
      )
      data = res.data?.result?.[contractAddress.toLowerCase()] || {}
    } else {
      // EVM chains (BSC etc.)
      const res = await axios.get(
        `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${contractAddress}`,
        { timeout: 15000 }
      )
      data = res.data?.result?.[contractAddress.toLowerCase()] || {}
    }

    // Parse the results into a clean risk report
    const risks = []
    const passes = []

    // ── Honeypot check ─────────────────────────────────────────────────────
    if (data.is_honeypot === '1') {
      risks.push({ severity: 'critical', label: 'Honeypot detected', detail: 'Contract prevents selling' })
    } else {
      passes.push({ label: 'Not a honeypot' })
    }

    // ── Mint function ──────────────────────────────────────────────────────
    if (data.is_mintable === '1') {
      risks.push({ severity: 'high', label: 'Mintable supply', detail: 'Owner can create more tokens' })
    } else {
      passes.push({ label: 'Fixed supply' })
    }

    // ── Blacklist ──────────────────────────────────────────────────────────
    if (data.is_blacklisted === '1') {
      risks.push({ severity: 'medium', label: 'Blacklist function', detail: 'Owner can block wallets from trading' })
    } else {
      passes.push({ label: 'No blacklist' })
    }

    // ── Proxy contract ─────────────────────────────────────────────────────
    if (data.is_proxy === '1') {
      risks.push({ severity: 'medium', label: 'Proxy contract', detail: 'Logic can be changed after deploy' })
    } else {
      passes.push({ label: 'No proxy' })
    }

    // ── Owner privileges ───────────────────────────────────────────────────
    if (data.owner_address && data.owner_address !== '0x0000000000000000000000000000000000000000') {
      if (data.can_take_back_ownership === '1') {
        risks.push({ severity: 'high', label: 'Owner can reclaim', detail: 'Ownership can be taken back' })
      }
    } else {
      passes.push({ label: 'Ownership renounced' })
    }

    // ── Tax checks ─────────────────────────────────────────────────────────
    const buyTax = parseFloat(data.buy_tax || 0) * 100
    const sellTax = parseFloat(data.sell_tax || 0) * 100

    if (buyTax > 10) {
      risks.push({ severity: 'medium', label: `High buy tax: ${buyTax.toFixed(1)}%`, detail: 'Buyers lose significant value on purchase' })
    }
    if (sellTax > 10) {
      risks.push({ severity: 'high', label: `High sell tax: ${sellTax.toFixed(1)}%`, detail: 'Sellers lose significant value — potential honeypot' })
    }
    if (buyTax <= 10 && sellTax <= 10) {
      passes.push({ label: `Tax: ${buyTax.toFixed(1)}% buy / ${sellTax.toFixed(1)}% sell` })
    }

    // ── Holder concentration ───────────────────────────────────────────────
    const holders = data.holders || []
    const top10Pct = holders.slice(0, 10).reduce((sum, h) => sum + parseFloat(h.percent || 0), 0) * 100
    if (top10Pct > 50) {
      risks.push({ severity: 'medium', label: `Top 10 hold ${top10Pct.toFixed(1)}%`, detail: 'High concentration risk' })
    } else if (top10Pct > 0) {
      passes.push({ label: `Top 10 hold ${top10Pct.toFixed(1)}%` })
    }

    // ── Overall score ──────────────────────────────────────────────────────
    const criticalCount = risks.filter(r => r.severity === 'critical').length
    const highCount = risks.filter(r => r.severity === 'high').length
    const mediumCount = risks.filter(r => r.severity === 'medium').length

    let score = 100
    score -= criticalCount * 40
    score -= highCount * 20
    score -= mediumCount * 10
    score = Math.max(0, score)

    const overallRisk = criticalCount > 0 ? 'critical'
      : highCount > 0 ? 'high'
      : mediumCount > 1 ? 'medium'
      : 'low'

    return {
      contract_address: contractAddress,
      chain,
      score,
      overall_risk: overallRisk,
      risks,
      passes,
      raw: data,
      scanned_at: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[GoPlus] Audit scan failed:', err.message)
    throw err
  }
}

module.exports = { runAuditScan }
