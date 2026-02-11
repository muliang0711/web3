// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardToken is ERC20 {
    // ============================================================
    //                        STATE VARIABLES
    // ============================================================

    address public platform;

    // ============================================================
    //                           EVENTS
    // ============================================================

    event RewardAllocated(
        uint256 indexed projectId,
        address indexed recipient,
        uint256 tokenAmount
    );

    // ============================================================
    //                         MODIFIERS
    // ============================================================

    modifier onlyPlatform() {
        require(msg.sender == platform, "Only platform can call this");
        _;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /// @notice Initialize the RewardToken with a name and symbol
    /// @param _platform The address of the CrowdfundingPlatform contract
    constructor(address _platform) ERC20("CrowdfundReward", "CFRD") {
        require(_platform != address(0), "Invalid platform address");
        platform = _platform;
    }

    // ============================================================
    //                     EXTERNAL FUNCTIONS
    // ============================================================

    /// @notice Distribute reward tokens to a contributor
    /// @param _to The recipient address
    /// @param _projectId The campaign ID associated with this reward
    /// @param _amount The number of tokens to mint
    function distributeRewards(
        address _to,
        uint256 _projectId,
        uint256 _amount
    ) external onlyPlatform {
        require(_to != address(0), "Cannot reward zero address");
        require(_amount > 0, "Amount must be greater than 0");

        _mint(_to, _amount);

        emit RewardAllocated(_projectId, _to, _amount);
    }

    /// @notice Update platform address (only current platform can do this)
    /// @param _newPlatform The new platform address
    function updatePlatform(address _newPlatform) external onlyPlatform {
        require(_newPlatform != address(0), "Invalid platform address");
        platform = _newPlatform;
    }
}
