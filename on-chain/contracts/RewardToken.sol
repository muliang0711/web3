// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
// HY
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardToken
/// @notice ERC-20 reward token distributed through RewardManager
/// @dev Rule: 1 token = 1 ETH contributed (token uses 18 decimals by default)
// me
contract RewardToken is ERC20, Ownable {
    constructor() ERC20("CrowdfundReward", "CFR") Ownable(msg.sender) {}

    /// @notice Mint reward tokens to a contributor
    /// @param _to Address of the contributor
    /// @param _amount Amount of tokens to mint (in wei-equivalent units)
    function mint(address _to, uint256 _amount) external onlyOwner {
        if (_to == address(0)) {
            revert("Invalid recipient address");
        }
        if (_amount == 0) {
            revert("Mint amount must be greater than 0");
        }
        _mint(_to, _amount);
    }

    /// @notice RewardManager-compatible distribution entrypoint
    /// @param _to Address of the contributor
    /// @param _amount Amount of reward tokens to mint
    function distributeReward(address _to, uint256 _amount) external onlyOwner returns (bool) {
        if (_to == address(0)) {
            revert("Invalid recipient address");
        }
        if (_amount == 0) {
            revert("Mint amount must be greater than 0");
        }

        _mint(_to, _amount);
        return true;
    }

    /// @notice Burn reward tokens from a contributor when refunded donations reverse rewards
    /// @param _from Address of the contributor
    /// @param _amount Amount of reward tokens to burn
    function revokeReward(address _from, uint256 _amount) external onlyOwner returns (bool) {
        if (_from == address(0)) {
            revert("Invalid recipient address");
        }
        if (_amount == 0) {
            revert("Burn amount must be greater than 0");
        }

        _burn(_from, _amount);
        return true;
    }
}
