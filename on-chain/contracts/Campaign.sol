// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IUserRegistry {
    function recordDonation(address _user, uint256 _amount) external;
    function reverseDonation(address _user, uint256 _amount) external;
}

contract Campaign {
    // Groups the main campaign fields so the UI can fetch them in one call.
    struct CampaignInfo {
        address creator;
        string title;
        string description;
        uint256 fundingTarget;
        uint256 deadline;
        uint256 totalFunded;
        bool goalReached;
        bool fundsWithdrawn;
        bool isCancelled;
    }

    // Core campaign details and live funding status.
    address public creator;
    string public title;
    string public description;
    uint256 public fundingTarget;
    uint256 public deadline;
    uint256 public totalFunded;
    bool public goalReached;
    bool public fundsWithdrawn;
    bool public isCancelled;

    mapping(address => uint256) public contributions;
    address[] public contributors;

    IUserRegistry public userRegistry;

    // Emitted when money moves in or out of the campaign.
    event ContributionMade(address indexed contributor, uint256 amount);
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundIssued(address indexed contributor, uint256 amount);

    // Restricts sensitive actions to the campaign creator.
    modifier onlyCreator() {
        if (msg.sender != creator) {
            revert("Only the campaign creator can call this");
        }
        _;
    }

    // Sets the campaign details at deployment time.
    constructor(
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _fundingTarget,
        uint256 _durationInDays,
        address _userRegistryAddress
    ) {
        require(_creator != address(0), "Invalid creator address");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_fundingTarget > 0, "Funding target must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        require(_userRegistryAddress != address(0), "Invalid registry address");

        creator = _creator;
        title = _title;
        description = _description;
        fundingTarget = _fundingTarget;
        deadline = block.timestamp + (_durationInDays * 1 days);
        userRegistry = IUserRegistry(_userRegistryAddress);
    }

    // Main actions for contributing, withdrawing, and refunding.

    /// @notice Lets a supporter send ETH to the campaign while it is still open.
    function contribute() external payable {
        if (block.timestamp >= deadline) {
            revert("Campaign has ended");
        }
        if (isCancelled) {
            revert("Campaign is cancelled");
        }
        if (msg.value == 0) {
            revert("Contribution must be greater than 0");
        }
        if (address(userRegistry) == address(0)) {
            revert("User registry not configured");
        }

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        contributions[msg.sender] += msg.value;
        totalFunded += msg.value;

        if (totalFunded >= fundingTarget) {
            goalReached = true;
        }

        assert(totalFunded >= contributions[msg.sender]);
        assert(!goalReached || totalFunded >= fundingTarget);

        userRegistry.recordDonation(msg.sender, msg.value);

        emit ContributionMade(msg.sender, msg.value);
    }

    /// @notice Lets the creator withdraw the funds as soon as the funding goal is met.
    function withdrawFunds() external onlyCreator {
        require(goalReached, "Funding target was not reached");
        require(!fundsWithdrawn, "Funds already withdrawn");

        fundsWithdrawn = true;
        uint256 amount = address(this).balance;

        (bool success, ) = payable(creator).call{value: amount}("");
        require(success, "Transfer failed");
        assert(address(this).balance == 0);

        emit FundsWithdrawn(creator, amount);
    }

    /// @notice Lets a contributor reclaim their ETH if the campaign failed or was cancelled.
    function refund() external {
        require(block.timestamp >= deadline || isCancelled, "Campaign has not ended yet");
        require(!goalReached, "Funding target was reached, no refunds");
        require(contributions[msg.sender] > 0, "No contribution to refund");

        uint256 amount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        totalFunded -= amount;
        userRegistry.reverseDonation(msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit RefundIssued(msg.sender, amount);
    }

    /// @notice Lets the creator return every outstanding contribution after a failed campaign.
    function refundAll() external onlyCreator {
        require(!goalReached, "Funding target was reached, no refunds");
        require(!fundsWithdrawn, "Funds already withdrawn");

        uint256 refundedCount = 0;
        uint256 refundedAmount = 0;

        isCancelled = true;

        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            uint256 amount = contributions[contributor];

            if (amount == 0) {
                continue;
            }

            contributions[contributor] = 0;
            refundedCount += 1;
            refundedAmount += amount;
            userRegistry.reverseDonation(contributor, amount);

            (bool success, ) = payable(contributor).call{value: amount}("");
            require(success, "Refund transfer failed");

            emit RefundIssued(contributor, amount);
        }

        require(refundedCount > 0, "No contributions to refund");
        totalFunded -= refundedAmount;
    }

    // Read-only helpers for the frontend and external callers.

    /// @notice Returns the full campaign snapshot in a single struct.
    function getCampaignInfo() external view returns (CampaignInfo memory) {
        return
            CampaignInfo({
                creator: creator,
                title: title,
                description: description,
                fundingTarget: fundingTarget,
                deadline: deadline,
                totalFunded: totalFunded,
                goalReached: goalReached,
                fundsWithdrawn: fundsWithdrawn,
                isCancelled: isCancelled
            });
    }

    /// @notice Returns how much a given address has contributed so far.
    function getContribution(
        address _contributor
    ) external view returns (uint256) {
        return contributions[_contributor];
    }

    /// @notice Returns the list of wallet addresses that have contributed at least once.
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /// @notice Counts contributors whose contribution balance has not been refunded yet.
    function getOutstandingRefundCount() external view returns (uint256) {
        uint256 count = 0;

        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributions[contributors[i]] > 0) {
                count += 1;
            }
        }

        return count;
    }
}
