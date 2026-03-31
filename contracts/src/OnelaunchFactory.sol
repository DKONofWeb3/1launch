// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OnelaunchToken.sol";

// ─────────────────────────────────────────────────────────────────────────────
// OnelaunchFactory.sol
//
// This is the Factory contract — the heart of the 1launch BSC deployment.
//
// Why a factory?
// Instead of deploying a brand new contract every time from scratch (which
// would require you to store the bytecode, compile it etc.), we deploy this
// factory ONCE. Then anyone can call createToken() on it to spin up a fresh
// token. The factory stores a record of every token it has ever created.
//
// We deploy this factory to BSC testnet first, and the same contract works
// on mainnet when ready. The only difference is the RPC URL.
// ─────────────────────────────────────────────────────────────────────────────

contract OnelaunchFactory {

    // ── Storage ───────────────────────────────────────────────────────────────

    address public platformWallet;   // 1launch wallet that collects fees
    uint256 public deployFee;        // Fee in BNB (wei) per token launch

    // Track every token this factory has created
    address[] public allTokens;

    // Map a creator's wallet to all tokens they've launched through 1launch
    mapping(address => address[]) public tokensByCreator;

    // ── Events ────────────────────────────────────────────────────────────────

    event TokenCreated(
        address indexed token,          // Address of the new token contract
        address indexed creator,        // Who launched it
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 timestamp
    );

    event FeeUpdated(uint256 newFee);

    // ── Constructor ───────────────────────────────────────────────────────────
    //
    // _platformWallet: Your wallet — fees go here
    // _deployFee:      Fee in wei (18 decimals). For $15 at ~$600/BNB:
    //                  0.025 BNB = 25_000_000_000_000_000 wei

    constructor(address _platformWallet, uint256 _deployFee) {
        platformWallet = _platformWallet;
        deployFee      = _deployFee;
    }

    // ── Core Function: createToken ────────────────────────────────────────────
    //
    // This is what gets called when a user clicks "Deploy" in the 1launch UI.
    //
    // What happens step by step:
    // 1. User sends a transaction to this function with the deploy fee in BNB
    // 2. We check they sent enough BNB
    // 3. We forward the fee to the platform wallet
    // 4. We deploy a brand new OnelaunchToken contract with their parameters
    // 5. We record the new token address in our registry
    // 6. We emit a TokenCreated event so the frontend knows it worked
    //
    // Parameters:
    //   _name        — "Solana Savior"
    //   _symbol      — "SOLVI"
    //   _totalSupply — 1000000000 (1 billion, without decimals)
    //   _owner       — User's wallet address (gets all the tokens)
    //
    // payable: This function accepts BNB (the "value" in the transaction)

    function createToken(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _owner
    ) external payable returns (address) {

        // ── Step 1: Validate fee ──────────────────────────────────────────────
        // msg.value is the amount of BNB the user sent with this transaction.
        // require() reverts the whole transaction if the condition is false.
        // Reverted transactions cost some gas but return unused ETH/BNB.
        require(msg.value >= deployFee, "Insufficient deploy fee");

        // ── Step 2: Forward fee to platform ──────────────────────────────────
        // Transfer BNB to the platform wallet.
        // Using call() instead of transfer() — safer for modern Solidity.
        (bool sent,) = platformWallet.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        // ── Step 3: Deploy the token contract ─────────────────────────────────
        // "new OnelaunchToken(...)" deploys a fresh contract to the blockchain.
        // The constructor runs, tokens are minted to _owner.
        // This returns the address of the newly deployed contract.
        OnelaunchToken token = new OnelaunchToken(
            _name,
            _symbol,
            _totalSupply,
            _owner
        );

        address tokenAddress = address(token);

        // ── Step 4: Register the token ────────────────────────────────────────
        allTokens.push(tokenAddress);
        tokensByCreator[_owner].push(tokenAddress);

        // ── Step 5: Emit event ────────────────────────────────────────────────
        emit TokenCreated(
            tokenAddress,
            _owner,
            _name,
            _symbol,
            _totalSupply,
            block.timestamp
        );

        return tokenAddress;
    }

    // ── View Functions ────────────────────────────────────────────────────────
    // These don't modify state, cost no gas to call.

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }

    function getTotalTokensCreated() external view returns (uint256) {
        return allTokens.length;
    }

    // ── Admin Functions ───────────────────────────────────────────────────────

    // Update the deploy fee (in case BNB price changes drastically)
    function updateFee(uint256 newFee) external {
        require(msg.sender == platformWallet, "Not platform");
        deployFee = newFee;
        emit FeeUpdated(newFee);
    }
}
