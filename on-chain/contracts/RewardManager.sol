// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Minimal token interface used to mint and revoke rewards.
interface IRewardToken {
    function distributeReward(address _to, uint256 _amount) external returns (bool);
    function revokeReward(address _from, uint256 _amount) external returns (bool);
}

// Minimal registry interface used when users claim or lose rewards.
interface IUserRegistry {
    function getClaimableRewards(address _user) external view returns (uint256);
    function resetRewards(address _user) external;
}

contract RewardManager {

    // External contracts and access control for reward operations.
    IRewardToken public rewardToken;
    IUserRegistry public userRegistry;
    address public owner;

    // Emitted when rewards are claimed or revoked.
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardRevoked(address indexed user, uint256 amount);

    // Wires the token and registry addresses during deployment.
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

    // Keeps administrative functions restricted to the contract owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyUserRegistry() {
        require(msg.sender == address(userRegistry), "Only UserRegistry can call this");
        _;
    }

    // Claims the caller's current reward balance from the registry.
    function claimRewards() external {
        uint256 amount = userRegistry.getClaimableRewards(msg.sender);
        require(amount > 0, "No rewards to claim");

        // Clear the pending balance before minting to reduce reentrancy risk.
        userRegistry.resetRewards(msg.sender);

        // Mint the matching amount of reward tokens to the caller.
        bool success = rewardToken.distributeReward(msg.sender, amount);
        require(success, "Reward transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    /// @notice Burns rewards when a refunded donation means the user no longer qualifies for them.
    function revokeRewards(address _user, uint256 _amount) external onlyUserRegistry {
        require(_user != address(0), "Invalid user address");
        require(_amount > 0, "No rewards to revoke");

        bool success = rewardToken.revokeReward(_user, _amount);
        require(success, "Reward revoke failed");

        emit RewardRevoked(_user, _amount);
    }
}
