// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CrowdfundingPlatform {
    // ============================================================
    //                        STATE VARIABLES
    // ============================================================

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => uint256)) public refunds;

    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 totalRaised;
        uint8 status; // 0=Active, 1=Success, 2=Failed, 3=Cancelled
        bool fundsWithdrawn;
    }

    // ============================================================
    //                           EVENTS
    // ============================================================

    event CampaignCreated(
        uint256 indexed projectId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline,
        uint256 timestamp
    );

    event CampaignStatusChanged(
        uint256 indexed projectId,
        uint8 indexed newStatus,
        uint256 timestamp
    );

    event ContributionReceived(
        uint256 indexed projectId,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );

    event FundsWithdrawn(
        uint256 indexed projectId,
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    event RefundClaimed(
        uint256 indexed projectId,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );

    // ============================================================
    //                         MODIFIERS
    // ============================================================

    modifier campaignExists(uint256 _projectId) {
        require(
            _projectId > 0 && _projectId <= campaignCount,
            "Campaign does not exist"
        );
        _;
    }

    // ============================================================
    //                     EXTERNAL FUNCTIONS
    // ============================================================

    /// @notice Create a new crowdfunding campaign
    /// @param _title Campaign title
    /// @param _description Campaign description
    /// @param _goal Funding goal in wei
    /// @param _durationInDays Campaign duration in days
    /// @return The new campaign ID
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationInDays
    ) external returns (uint256) {
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");

        campaignCount++;
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);

        campaigns[campaignCount] = Campaign({
            creator: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            deadline: deadline,
            totalRaised: 0,
            status: 0, // Active
            fundsWithdrawn: false
        });

        emit CampaignCreated(
            campaignCount,
            msg.sender,
            _title,
            _goal,
            deadline,
            block.timestamp
        );

        return campaignCount;
    }

    /// @notice Contribute ETH to a campaign
    /// @param _projectId The campaign ID to contribute to
    function contribute(
        uint256 _projectId
    ) external payable campaignExists(_projectId) {
        Campaign storage campaign = campaigns[_projectId];

        require(campaign.status == 0, "Campaign is not active");
        require(
            block.timestamp < campaign.deadline,
            "Campaign deadline has passed"
        );
        require(msg.value > 0, "Contribution must be greater than 0");

        // Effects
        contributions[_projectId][msg.sender] += msg.value;
        campaign.totalRaised += msg.value;

        emit ContributionReceived(
            _projectId,
            msg.sender,
            msg.value,
            block.timestamp
        );

        // Check if goal reached
        if (campaign.totalRaised >= campaign.goal && campaign.status == 0) {
            campaign.status = 1; // Success
            emit CampaignStatusChanged(_projectId, 1, block.timestamp);
        }
    }

    /// @notice Withdraw funds from a successful campaign (creator only)
    /// @param _projectId The campaign ID to withdraw from
    function withdrawFunds(
        uint256 _projectId
    ) external campaignExists(_projectId) {
        Campaign storage campaign = campaigns[_projectId];

        require(msg.sender == campaign.creator, "Only creator can withdraw");
        require(
            campaign.status == 1 || campaign.totalRaised >= campaign.goal,
            "Campaign has not reached its goal"
        );
        require(!campaign.fundsWithdrawn, "Funds already withdrawn");

        // Effects first (Checks-Effects-Interactions)
        campaign.fundsWithdrawn = true;
        uint256 amount = campaign.totalRaised;

        // Update status if not already
        if (campaign.status != 1) {
            campaign.status = 1;
            emit CampaignStatusChanged(_projectId, 1, block.timestamp);
        }

        emit FundsWithdrawn(_projectId, msg.sender, amount, block.timestamp);

        // Interaction last
        payable(msg.sender).transfer(amount);
    }

    /// @notice Claim a refund from a failed campaign (Pull Payment pattern)
    /// @param _projectId The campaign ID to claim refund from
    function claimRefund(
        uint256 _projectId
    ) external campaignExists(_projectId) {
        Campaign storage campaign = campaigns[_projectId];

        require(
            block.timestamp > campaign.deadline &&
                campaign.totalRaised < campaign.goal,
            "Campaign is not failed"
        );

        // Update status to Failed if not already
        if (campaign.status != 2) {
            campaign.status = 2;
            emit CampaignStatusChanged(_projectId, 2, block.timestamp);
        }

        uint256 refundAmount = contributions[_projectId][msg.sender];
        require(refundAmount > 0, "No contribution to refund");

        // Effects first (Checks-Effects-Interactions, prevent re-entrancy)
        contributions[_projectId][msg.sender] = 0;
        refunds[_projectId][msg.sender] = refundAmount;

        emit RefundClaimed(
            _projectId,
            msg.sender,
            refundAmount,
            block.timestamp
        );

        // Interaction last
        payable(msg.sender).transfer(refundAmount);
    }

    /// @notice Check and update the status of a campaign
    /// @param _projectId The campaign ID to check
    function checkAndUpdateStatus(
        uint256 _projectId
    ) public campaignExists(_projectId) {
        Campaign storage campaign = campaigns[_projectId];

        if (
            block.timestamp > campaign.deadline &&
            campaign.totalRaised < campaign.goal
        ) {
            if (campaign.status != 2) {
                campaign.status = 2; // Failed
                emit CampaignStatusChanged(_projectId, 2, block.timestamp);
            }
        } else if (campaign.totalRaised >= campaign.goal) {
            if (campaign.status != 1) {
                campaign.status = 1; // Success
                emit CampaignStatusChanged(_projectId, 1, block.timestamp);
            }
        }
    }

    // ============================================================
    //                       VIEW FUNCTIONS
    // ============================================================

    /// @notice Get full campaign details
    function getCampaign(
        uint256 _projectId
    )
        external
        view
        campaignExists(_projectId)
        returns (
            address creator,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 deadline,
            uint256 totalRaised,
            uint8 status,
            bool fundsWithdrawn
        )
    {
        Campaign storage c = campaigns[_projectId];
        return (
            c.creator,
            c.title,
            c.description,
            c.goal,
            c.deadline,
            c.totalRaised,
            c.status,
            c.fundsWithdrawn
        );
    }

    /// @notice Get contribution amount for a specific contributor
    function getContribution(
        uint256 _projectId,
        address _contributor
    ) external view returns (uint256) {
        return contributions[_projectId][_contributor];
    }
}
