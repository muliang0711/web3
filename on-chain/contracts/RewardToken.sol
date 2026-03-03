// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
// HY
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardToken
/// @notice ERC-20 reward token distributed to contributors of successful campaigns
/// @dev Rule: 1 token = 1 ETH contributed (token uses 18 decimals by default)
// me
contract RewardToken is ERC20, Ownable {
    constructor() ERC20("CrowdfundReward", "CFR") Ownable(msg.sender) {}

    /// @notice Mint reward tokens to a contributor
    /// @param _to Address of the contributor
    /// @param _amount Amount of tokens to mint (in wei-equivalent units)
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
