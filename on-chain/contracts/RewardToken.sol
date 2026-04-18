// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardToken
/// @notice ERC-20 token minted to contributors through the reward manager.
/// @dev The token uses the default 18 decimals, so 1 token maps to 1 ETH in wei units.
contract RewardToken is ERC20, Ownable {
    constructor() ERC20("CrowdfundReward", "CFR") Ownable(msg.sender) {}

    /// @notice Mints reward tokens directly to a contributor.
    /// @param _to The wallet receiving the reward tokens.
    /// @param _amount The number of tokens to mint, using the token's 18-decimal units.
    function mint(address _to, uint256 _amount) external onlyOwner {
        if (_to == address(0)) {
            revert("Invalid recipient address");
        }
        if (_amount == 0) {
            revert("Mint amount must be greater than 0");
        }
        _mint(_to, _amount);
    }

    /// @notice Mints rewards through the entrypoint expected by `RewardManager`.
    /// @param _to The wallet receiving the reward tokens.
    /// @param _amount The number of reward tokens to mint.
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

    /// @notice Burns rewards from a contributor after a refunded donation.
    /// @param _from The wallet whose reward balance should be reduced.
    /// @param _amount The number of reward tokens to burn.
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
