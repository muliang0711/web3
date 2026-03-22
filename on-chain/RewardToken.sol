// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardToken
 * @notice Custom ERC-20 token for crowdfunding rewards.
 * @dev Explicitly includes transfer logic as per team leader requirements.
 */
contract RewardToken is ERC20, Ownable {

    constructor() ERC20("CrowdfundReward", "CFR") Ownable(msg.sender) {}

    /**
     * @notice Mint new tokens (increases total supply)
     * @param _to Address receiving the new tokens
     * @param _amount Amount to create
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @notice Explicit Transfer function (Requirement: Token Transfer)
     * @dev Transfers tokens from this contract's treasury to a donor.
     * @param _to The address of the donor
     * @param _amount The amount of CFR tokens to transfer
     */
    function distributeReward(address _to, uint256 _amount) external onlyOwner returns (bool) {
        // We use the internal _transfer function from OpenZeppelin 
        // to move tokens from the contract itself (this) to the user.
        _transfer(address(this), _to, _amount);
        return true;
    }
}
