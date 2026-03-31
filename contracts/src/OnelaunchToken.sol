// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// OnelaunchToken.sol
//
// This is the ERC-20 token contract that gets deployed for every memecoin
// launched through 1launch on BSC.
//
// What is ERC-20?
// It's a standard interface that every token on EVM chains (BSC, Ethereum,
// Base etc.) follows. It defines a set of functions every token must have:
// totalSupply(), balanceOf(), transfer(), approve(), transferFrom().
// Because every token follows the same interface, DEXes like PancakeSwap
// can list any token without knowing anything about it in advance.
//
// We implement ERC-20 from scratch here so you understand every line.
// ─────────────────────────────────────────────────────────────────────────────

contract OnelaunchToken {

    // ── Storage variables ─────────────────────────────────────────────────────
    // These live permanently on-chain — they cost gas to write, nothing to read.

    string public name;         // Full token name, e.g. "Solana Savior"
    string public symbol;       // Ticker, e.g. "SOLVI"
    uint8  public decimals = 18; // Standard 18 decimal places (like ETH)
                                 // 1 token = 1_000_000_000_000_000_000 (1e18) base units
    uint256 public totalSupply;

    address public owner;        // Who deployed this token
    bool    public renounced;    // If true, owner gave up ownership permanently

    // ERC-20 core mappings:
    // balanceOf: wallet address → how many tokens they hold
    mapping(address => uint256) public balanceOf;

    // allowance: owner → spender → how many tokens spender is allowed to move
    // This is used by DEXes — you approve PancakeSwap to spend your tokens,
    // then PancakeSwap calls transferFrom() on your behalf when you swap.
    mapping(address => mapping(address => uint256)) public allowance;

    // ── Events ─────────────────────────────────────────────────────────────────
    // Events are logged to the blockchain and are readable by frontends.
    // They don't cost much gas and are used to track activity.

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipRenounced(address indexed previousOwner);

    // ── Modifier ───────────────────────────────────────────────────────────────
    // Modifiers are reusable guards that wrap functions.
    // onlyOwner ensures only the contract owner can call certain functions.

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;  // This means "now execute the function body"
    }

    // ── Constructor ────────────────────────────────────────────────────────────
    // The constructor runs ONCE when the contract is first deployed.
    // It sets up the initial state of the token.
    //
    // Parameters:
    //   _name        — Token name ("Solana Savior")
    //   _symbol      — Ticker ("SOLVI")
    //   _totalSupply — How many tokens to mint, e.g. 1_000_000_000 (1 billion)
    //   _owner       — Who gets all the tokens and owns the contract
    //                  (this will be set to the user's wallet address)

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _owner
    ) {
        name        = _name;
        symbol      = _symbol;
        owner       = _owner;

        // Convert the human-readable supply to the token's base units.
        // If you want 1,000,000,000 tokens with 18 decimals:
        // actualSupply = 1_000_000_000 * 10^18
        uint256 actualSupply = _totalSupply * (10 ** uint256(decimals));
        totalSupply          = actualSupply;

        // Mint all tokens to the owner's wallet at deployment.
        // "Minting" means creating tokens from nothing — only happens once here.
        balanceOf[_owner] = actualSupply;

        // Emit a Transfer event from address(0) — the zero address.
        // By convention, Transfer from 0x0 means tokens were minted.
        emit Transfer(address(0), _owner, actualSupply);
    }

    // ── ERC-20 Core Functions ─────────────────────────────────────────────────

    // transfer: Send tokens from your wallet to another address.
    // msg.sender is always whoever called this function.

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // approve: Allow a spender (like PancakeSwap router) to move tokens on
    // your behalf. You call this before adding liquidity or using a DEX.

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // transferFrom: The spender (DEX/router) calls this to actually move tokens
    // after the user has approved them. It checks the allowance first.

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;

        emit Transfer(from, to, amount);
        return true;
    }

    // ── Ownership ─────────────────────────────────────────────────────────────

    // renounceOwnership: Permanently give up ownership.
    // After this, no one can call onlyOwner functions ever again.
    // This makes the contract "trustless" — degens love this because it means
    // the deployer can't rug pull by changing settings later.

    function renounceOwnership() external onlyOwner {
        emit OwnershipRenounced(owner);
        owner    = address(0);
        renounced = true;
    }
}
