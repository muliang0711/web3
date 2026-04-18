// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IRewardManager {
    function revokeRewards(address _user, uint256 _amount) external;
}

// Stores user profiles, donation history, and claimable reward balances.
contract UserRegistry {
    // Basic profile information saved for each registered wallet.
    struct User {
        string name;
        bool isRegistered;
    }

    // Tracks each donation so the app can show campaign history per user.
    struct DonationRecord {
        address campaign;
        uint256 amount;
        uint256 timestamp;
    }

    // User accounts, donation history, and campaign permissions.
    mapping(address => User) public users;
    mapping(address => DonationRecord[]) public userDonations;

    // Reward balances that users can still claim.
    mapping(address => uint256) public claimableRewards;
    mapping(address => bool) public authorizedCampaigns;

    // Connected contract addresses and ownership data.
    address public rewardManager;
    address public campaignFactory;
    address public owner;

    // Emitted when users register or when donations are added or reversed.
    event UserRegistered(address indexed userAddress, string username, uint256 timestamp);
    event DonationRecorded(address indexed user, address indexed campaign, uint256 amount, uint256 timestamp);
    event DonationReversed(address indexed user, address indexed campaign, uint256 amount, uint256 timestamp);

    // Sets the deployer as the initial owner.
    constructor() {
        owner = msg.sender;
    }

    // Access control for the contracts that are allowed to update registry state.
    modifier onlyRewardManager() {
        require(msg.sender == rewardManager, "Only RewardManager can call this");
        _;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    modifier onlyCampaignFactory() {
        require(msg.sender == campaignFactory, "Only CampaignFactory can call this");
        _;
    }

    function register(string memory _name) public {
        // Prevent empty usernames and duplicate registrations.
        require(bytes(_name).length > 0, "Username cannot be empty");
        require(!users[msg.sender].isRegistered, "User already registered");

        // Save the user profile and emit an event for off-chain listeners.
        users[msg.sender] = User(_name, true);
        emit UserRegistered(msg.sender, _name, block.timestamp);
    }

    function getUser(address _userAddress) public view returns (User memory) {
        return users[_userAddress];
    }

    function recordDonation(address _user, uint256 _amount) external {
        require(authorizedCampaigns[msg.sender], "Only authorized campaigns can record donations");
        if (_user == address(0)) {
            revert("Invalid user address");
        }
        if (_amount == 0) {
            revert("Donation amount must be greater than 0");
        }

        userDonations[_user].push(DonationRecord(msg.sender, _amount, block.timestamp));
        claimableRewards[_user] += _amount;
        emit DonationRecorded(_user, msg.sender, _amount, block.timestamp);
    }

    function reverseDonation(address _user, uint256 _amount) external {
        require(authorizedCampaigns[msg.sender], "Only authorized campaigns can reverse donations");
        if (_user == address(0)) {
            revert("Invalid user address");
        }
        if (_amount == 0) {
            revert("Refund amount must be greater than 0");
        }

        uint256 availableClaimable = claimableRewards[_user];

        if (availableClaimable >= _amount) {
            claimableRewards[_user] = availableClaimable - _amount;
        } else {
            claimableRewards[_user] = 0;

            uint256 amountToRevoke = _amount - availableClaimable;
            if (rewardManager == address(0)) {
                revert("Reward manager not configured");
            }

            IRewardManager(rewardManager).revokeRewards(_user, amountToRevoke);
        }

        emit DonationReversed(_user, msg.sender, _amount, block.timestamp);
    }

    function getUserDonations(address _userAddress) public view returns (DonationRecord[] memory) {
        return userDonations[_userAddress];
    }

    // Returns the reward balance a user can still claim.
    function getClaimableRewards(address _user) external view returns (uint256) {
        return claimableRewards[_user];
    }

    // Clears a user's pending reward balance after the reward manager mints tokens.
    function resetRewards(address _user) external onlyRewardManager {
        claimableRewards[_user] = 0;
    }

    // Lets the owner connect the reward manager contract once it is deployed.
    function setRewardManager(address _rewardManager) external onlyOwner {
        if (_rewardManager == address(0)) {
            revert("Invalid reward manager");
        }
        rewardManager = _rewardManager;
    }

    function setCampaignFactory(address _campaignFactory) external onlyOwner {
        if (_campaignFactory == address(0)) {
            revert("Invalid campaign factory");
        }
        campaignFactory = _campaignFactory;
    }

    function authorizeCampaign(address _campaign) external onlyCampaignFactory {
        if (_campaign == address(0)) {
            revert("Invalid campaign address");
        }
        authorizedCampaigns[_campaign] = true;
    }
}
