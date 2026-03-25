// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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

    // mapping to track points (JJ)
    mapping(address => uint256) public claimableRewards;

    // Security & Architecture variables (JJ)
    address public rewardManager;
    address public owner;

    // 3. events :
    event UserRegistered(address indexed userAddress, string username, uint256 timestamp);
    event DonationRecorded(address indexed user, address indexed campaign, uint256 amount, uint256 timestamp);

    // constructor(JJ)
    constructor() {
        owner = msg.sender;
    }

    // MODIFIERS 
    modifier onlyRewardManager() {
        require(msg.sender == rewardManager, "Only RewardManager can call this");
        _;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
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
    }

    function getUserDonations(address _userAddress) public view returns (DonationRecord[] memory) {
        return userDonations[_userAddress];
    }

    // REWARD MANAGER INTEGRATION
    
    // JJ: getter function
    function getClaimableRewards(address _user) external view returns (uint256) {
        return claimableRewards[_user];
    }

    // Secure reset (Removed the duplicate, kept the safe one)
    function resetRewards(address _user) external onlyRewardManager {
        claimableRewards[_user] = 0;
    }

    // onlyOwner so hackers can't change the manager
    function setRewardManager(address _rewardManager) external onlyOwner {
        rewardManager = _rewardManager;
    }
}
