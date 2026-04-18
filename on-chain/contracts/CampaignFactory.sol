// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Campaign.sol";

interface IUserRegistryAdmin {
    function authorizeCampaign(address _campaign) external;
}

contract CampaignFactory {
    // Stores every deployed campaign and groups them by creator.
    address[] public campaigns;
    mapping(address => address[]) public userCampaigns;
    address public userRegistryAddress;

    constructor(address _userRegistryAddress) {
        if (_userRegistryAddress == address(0)) {
            revert("Invalid registry address");
        }
        userRegistryAddress = _userRegistryAddress;
    }

    // Emitted whenever the factory deploys a new campaign.
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        string title,
        uint256 fundingTarget,
        uint256 durationInDays
    );

    // Deployment and lookup helpers for campaigns created through the factory.

    /// @notice Deploys a new campaign and registers it with the user registry.
    /// @param _title The public name of the campaign.
    /// @param _description The campaign summary shown to users.
    /// @param _fundingTarget The minimum amount of ETH the campaign wants to raise.
    /// @param _durationInDays The number of days the campaign stays open.
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _fundingTarget,
        uint256 _durationInDays
    ) external returns (address) {
        if (bytes(_title).length == 0) {
            revert("Title cannot be empty");
        }
        if (_fundingTarget == 0) {
            revert("Funding target must be greater than 0");
        }
        if (_durationInDays == 0) {
            revert("Duration must be greater than 0");
        }

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
        IUserRegistryAdmin(userRegistryAddress).authorizeCampaign(campaignAddress);

        assert(campaigns[campaigns.length - 1] == campaignAddress);
        assert(
            userCampaigns[msg.sender][userCampaigns[msg.sender].length - 1] ==
                campaignAddress
        );

        emit CampaignCreated(
            campaignAddress,
            msg.sender,
            _title,
            _fundingTarget,
            _durationInDays
        );

        return campaignAddress;
    }

    /// @notice Returns every campaign address deployed by this factory.
    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    /// @notice Returns the campaigns created by a specific wallet.
    function getUserCampaigns(
        address _user
    ) external view returns (address[] memory) {
        return userCampaigns[_user];
    }

    /// @notice Returns the total number of deployed campaigns.
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}
