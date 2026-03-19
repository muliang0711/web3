// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Campaign.sol";

contract CampaignFactory {
    // ── State Variables ────────────────────────────────────── // cyao : need to be able explain why need these state variable
    address[] public campaigns; // cyao : need to be able explain why need this state variable
    mapping(address => address[]) public userCampaigns; // cyao : need to be able explain why need this state variable
    address public userRegistryAddress;

    constructor(address _userRegistryAddress) {
        require(_userRegistryAddress != address(0), "Invalid registry address");
        userRegistryAddress = _userRegistryAddress;
    }

    // ── Events ─────────────────────────────────────────────── // cyao : need to be able explain why need these event
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        string title,
        uint256 fundingTarget,
        uint256 durationInDays
    );

    // ── Functions ──────────────────────────────────────────── cyao : all the fucntion below need to be able explain why need and how it work

    /// @notice Deploy a new Campaign contract
    /// @param _title Campaign title
    /// @param _description Campaign description
    /// @param _fundingTarget Funding target in wei
    /// @param _durationInDays Duration in days until deadline

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _fundingTarget,
        uint256 _durationInDays
    ) external returns (address) {
        Campaign newCampaign = new Campaign(
            msg.sender,
            _title,
            _description,
            _fundingTarget,
            _durationInDays,
            userRegistryAddress
        );

        address campaignAddress = address(newCampaign);
        campaigns.push(campaignAddress);
        userCampaigns[msg.sender].push(campaignAddress);

        emit CampaignCreated(
            campaignAddress,
            msg.sender,
            _title,
            _fundingTarget,
            _durationInDays
        );

        return campaignAddress;
    }

    /// @notice Get all deployed campaign addresses
    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    /// @notice Get campaigns created by a specific user
    function getUserCampaigns(
        address _user
    ) external view returns (address[] memory) {
        return userCampaigns[_user];
    }

    /// @notice Get total number of campaigns
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}
