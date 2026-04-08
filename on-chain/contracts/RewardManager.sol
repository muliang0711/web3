// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Interface for Reward Token
interface IRewardToken {
    function distributeReward(address _to, uint256 _amount) external returns (bool);
    function revokeReward(address _from, uint256 _amount) external returns (bool);
}

// Interface for UserRegistry (only functions we need)
interface IUserRegistry {
    function getClaimableRewards(address _user) external view returns (uint256);
    function resetRewards(address _user) external;
}

contract RewardManager {

    // State variables
    IRewardToken public rewardToken;
    IUserRegistry public userRegistry;
    address public owner;

    // Events
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardRevoked(address indexed user, uint256 amount);

    // Constructor
    constructor(address _tokenAddress, address _registryAddress) {
        if (_tokenAddress == address(0)) {
            revert("Invalid token address");
        }
        if (_registryAddress == address(0)) {
            revert("Invalid registry address");
        }
        rewardToken = IRewardToken(_tokenAddress);
        userRegistry = IUserRegistry(_registryAddress);
        owner = msg.sender;
    }

    // Modifier for owner-only functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyUserRegistry() {
        require(msg.sender == address(userRegistry), "Only UserRegistry can call this");
        _;
    }

    // Claim rewards function
    function claimRewards() external {
        uint256 amount = userRegistry.getClaimableRewards(msg.sender);
        require(amount > 0, "No rewards to claim");

        // SECURITY: Reset BEFORE transfer to prevent reentrancy
        userRegistry.resetRewards(msg.sender);

        // Transfer reward tokens
        bool success = rewardToken.distributeReward(msg.sender, amount);
        require(success, "Reward transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    /// @notice Revoke previously-earned rewards when refunded donations reverse eligibility
    function revokeRewards(address _user, uint256 _amount) external onlyUserRegistry {
        require(_user != address(0), "Invalid user address");
        require(_amount > 0, "No rewards to revoke");

        bool success = rewardToken.revokeReward(_user, _amount);
        require(success, "Reward revoke failed");

        emit RewardRevoked(_user, _amount);
    }
}
