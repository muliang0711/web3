// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// NEW: Interface added to fix "Undeclared identifier" error
// This allows the Registry to talk to the RewardToken contract
interface IRewardToken {
    function distributeReward(address _to, uint256 _amount) external returns (bool);
}

// HY : able to explain how it work
contract UserRegistry {
    // 1. struct :
    struct User {
        string name;
        bool isRegistered;
    }

    struct DonationRecord {
        address campaign;
        uint256 amount;
        uint256 timestamp;
    }

    // 2.state variable :
    mapping(address => User) public users;
    mapping(address => DonationRecord[]) public userDonations;
    
    // NEW: Variable added to store the Reward Token contract instance
    IRewardToken public rewardToken;

    // 3. events :
    event UserRegistered(address indexed userAddress, string username, uint256 timestamp);
    event DonationRecorded(address indexed user, address indexed campaign, uint256 amount, uint256 timestamp);

    // NEW: Constructor added to set the Reward Token address during deployment
    constructor(address _rewardTokenAddress) {
        rewardToken = IRewardToken(_rewardTokenAddress);
    }

    // 4. functions :
    function register(string memory _name) public {
        // modifier :
        require(bytes(_name).length > 0, "Username cannot be empty");
        require(!users[msg.sender].isRegistered, "User already registered");

        // logic :
        users[msg.sender] = User(_name, true);
        emit UserRegistered(msg.sender, _name, block.timestamp);
    }

    function getUser(address _userAddress) public view returns (User memory) {
        return users[_userAddress];
    }

    function recordDonation(address _user, uint256 _amount) external {
        userDonations[_user].push(DonationRecord(msg.sender, _amount, block.timestamp));
        emit DonationRecorded(_user, msg.sender, _amount, block.timestamp);
        
        // Final Link: Call the explicit transfer function in RewardToken
        // This satisfies the "Token Transfer" requirement
        rewardToken.distributeReward(_user, _amount);
    }

    function getUserDonations(address _userAddress) public view returns (DonationRecord[] memory) {
        return userDonations[_userAddress];
    }
}
