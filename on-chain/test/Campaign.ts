import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { network } from "hardhat";
import { parseEther, formatEther, getContract } from "viem";

// Type for the return value of getCampaignInfo()
type CampaignInfo = {
    title: string;
    description: string;
    creator: `0x${string}`;
    fundingTarget: bigint;
    deadline: bigint;
    totalFunded: bigint;
    goalReached: boolean;
    fundsWithdrawn: boolean;
};

// Load Campaign ABI from compiled artifact
const campaignArtifact = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../artifacts/contracts/Campaign.sol/Campaign.json"), "utf-8")
);
const campaignAbi = campaignArtifact.abi;

describe("Campaign Module", async function () {
    const { viem } = await network.connect();

    // ── Helpers ───────────────────────────────────────────────
    const getRevertReason = (err: any) => {
        if (err.details) return err.details;
        if (err.shortMessage) return err.shortMessage;
        return err.message;
    };

    // Get a Campaign contract instance at a given address using a specific wallet
    const getCampaignContract = async (address: `0x${string}`, walletIndex = 0) => {
        const publicClient = await viem.getPublicClient();
        const wallets = await viem.getWalletClients();
        return getContract({
            address,
            abi: campaignAbi,
            client: { public: publicClient, wallet: wallets[walletIndex] },
        });
    };

    const deployCampaignFactory = async () => {
        const userRegistry = await viem.deployContract("UserRegistry");
        return viem.deployContract("CampaignFactory", [userRegistry.address]);
    };

    // Advance time past the campaign deadline
    const advanceTime = async (days: number) => {
        const publicClient = await viem.getPublicClient();
        const seconds = days * 24 * 60 * 60;
        await (publicClient as any).transport.request({
            method: "evm_increaseTime",
            params: [seconds],
        });
        await (publicClient as any).transport.request({
            method: "evm_mine",
            params: [],
        });
    };

    // ══════════════════════════════════════════════════════════
    // 1. CAMPAIGN FACTORY TESTS
    // ══════════════════════════════════════════════════════════

    it("Should create a campaign via factory", async function () {
        const factory = await deployCampaignFactory();
        const [owner] = await viem.getWalletClients();

        console.log(`\n    [Test: Create Campaign via Factory]`);

        const title = "Save the Forest";
        const description = "A campaign to plant trees";
        const target = parseEther("10");
        const durationDays = 30n;

        const hash = await factory.write.createCampaign([title, description, target, durationDays]);
        console.log(`    Tx hash: ${hash}`);

        const campaigns = await factory.read.getCampaigns();
        console.log(`    Created campaigns: ${campaigns.length}`);
        assert.equal(campaigns.length, 1);

        // Verify the campaign metadata
        const campaign = await getCampaignContract(campaigns[0]);
        const info = await campaign.read.getCampaignInfo() as CampaignInfo;
        console.log(`    Campaign title: ${info.title}`);
        console.log(`    Funding target: ${formatEther(info.fundingTarget)} ETH`);
        console.log(`    Creator: ${info.creator}`);

        assert.equal(info.title, title);
        assert.equal(info.description, description);
        assert.equal(info.fundingTarget, target);
        assert.equal(info.creator.toLowerCase(), owner.account.address.toLowerCase());
        assert.equal(info.goalReached, false);
        assert.equal(info.fundsWithdrawn, false);
    });

    it("Should track campaigns by user", async function () {
        const factory = await deployCampaignFactory();
        const [owner] = await viem.getWalletClients();

        console.log(`\n    [Test: Track Campaigns by User]`);

        await factory.write.createCampaign(["Campaign A", "Desc A", parseEther("5"), 30n]);
        await factory.write.createCampaign(["Campaign B", "Desc B", parseEther("8"), 60n]);

        const allCampaigns = await factory.read.getCampaigns();
        const userCampaigns = await factory.read.getUserCampaigns([owner.account.address]);
        const count = await factory.read.getCampaignCount();

        console.log(`    Total campaigns: ${count}`);
        console.log(`    User campaigns: ${userCampaigns.length}`);

        assert.equal(allCampaigns.length, 2);
        assert.equal(userCampaigns.length, 2);
        assert.equal(count, 2n);
    });

    // ══════════════════════════════════════════════════════════
    // 2. CONTRIBUTION TESTS
    // ══════════════════════════════════════════════════════════

    it("Should accept contributions", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Accept Contributions]`);

        await factory.write.createCampaign(["Fund Me", "Description", parseEther("10"), 30n]);
        const campaigns = await factory.read.getCampaigns();

        // Use wallet index 1 as contributor
        const campaign = await getCampaignContract(campaigns[0], 1);
        const [, contributor] = await viem.getWalletClients();

        const contributionAmount = parseEther("2");
        await campaign.write.contribute([], { value: contributionAmount });

        const contribution = await campaign.read.getContribution([contributor.account.address]);
        const totalFunded = await campaign.read.totalFunded()
        const contributorsList = await campaign.read.getContributors() as readonly `0x${string}`[];

        console.log(`    Contribution: ${formatEther(contribution)} ETH`);
        console.log(`    Total funded: ${formatEther(totalFunded)} ETH`);
        console.log(`    Contributors count: ${contributorsList.length}`);

        assert.equal(contribution, contributionAmount);
        assert.equal(totalFunded, contributionAmount);
        assert.equal(contributorsList.length, 1);
    });

    it("Should handle multiple contributors", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Multiple Contributors]`);

        await factory.write.createCampaign(["Multi Fund", "Description", parseEther("10"), 30n]);
        const campaigns = await factory.read.getCampaigns();

        const c1 = await getCampaignContract(campaigns[0], 1);
        const c2 = await getCampaignContract(campaigns[0], 2);

        await c1.write.contribute([], { value: parseEther("3") });
        await c2.write.contribute([], { value: parseEther("5") });

        const campaignRead = await getCampaignContract(campaigns[0]);
        const totalFunded = await campaignRead.read.totalFunded();
        const contributorsList = await campaignRead.read.getContributors() as readonly `0x${string}`[];

        console.log(`    Total funded: ${formatEther(totalFunded)} ETH`);
        console.log(`    Contributors: ${contributorsList.length}`);

        assert.equal(totalFunded, parseEther("8"));
        assert.equal(contributorsList.length, 2);
    });

    it("Should fail to contribute after deadline", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Fail Contribute After Deadline]`);

        await factory.write.createCampaign(["Expired", "Description", parseEther("10"), 1n]); // 1 day
        const campaigns = await factory.read.getCampaigns();

        // Advance time past the deadline
        await advanceTime(2);

        const campaign = await getCampaignContract(campaigns[0], 1);

        await assert.rejects(
            () => campaign.write.contribute([], { value: parseEther("1") }),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert: "${reason}"`);
                return /Campaign has ended/.test(reason) || /Campaign has ended/.test(err.message);
            }
        );
    });

    // ══════════════════════════════════════════════════════════
    // 3. WITHDRAWAL TESTS
    // ══════════════════════════════════════════════════════════

    it("Should allow creator to withdraw after successful campaign", async function () {
        const factory = await deployCampaignFactory();
        const [creator] = await viem.getWalletClients();
        const publicClient = await viem.getPublicClient();

        console.log(`\n    [Test: Creator Withdraw After Success]`);

        const target = parseEther("5");
        await factory.write.createCampaign(["Funded!", "Description", target, 1n]);
        const campaigns = await factory.read.getCampaigns();

        // Contributor funds the campaign above target
        const contributorCampaign = await getCampaignContract(campaigns[0], 1);
        await contributorCampaign.write.contribute([], { value: parseEther("6") });

        // Advance past deadline
        await advanceTime(2);

        // Get creator balance before withdrawal
        const balanceBefore = await publicClient.getBalance({ address: creator.account.address });

        // Creator withdraws
        const creatorCampaign = await getCampaignContract(campaigns[0], 0);
        await creatorCampaign.write.withdrawFunds();

        const balanceAfter = await publicClient.getBalance({ address: creator.account.address });
        const info = await creatorCampaign.read.getCampaignInfo() as CampaignInfo;

        console.log(`    Goal reached: ${info.goalReached}`);
        console.log(`    Funds withdrawn: ${info.fundsWithdrawn}`);
        console.log(`    Creator balance increased: ${balanceAfter > balanceBefore}`);

        assert.equal(info.goalReached, true);
        assert.equal(info.fundsWithdrawn, true);
        assert.ok(balanceAfter > balanceBefore, "Creator balance should increase after withdrawal");
    });

    it("Should fail withdrawal if target not met", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Fail Withdraw If Target Not Met]`);

        await factory.write.createCampaign(["Underfunded", "Description", parseEther("100"), 1n]);
        const campaigns = await factory.read.getCampaigns();

        // Small contribution that won't meet the target
        const contributorCampaign = await getCampaignContract(campaigns[0], 1);
        await contributorCampaign.write.contribute([], { value: parseEther("1") });

        // Advance past deadline
        await advanceTime(2);

        const creatorCampaign = await getCampaignContract(campaigns[0], 0);

        await assert.rejects(
            () => creatorCampaign.write.withdrawFunds(),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert: "${reason}"`);
                return /Funding target was not reached/.test(reason) || /Funding target was not reached/.test(err.message);
            }
        );
    });

    it("Should fail withdrawal by non-creator", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Fail Withdraw By Non-Creator]`);

        await factory.write.createCampaign(["Protected", "Description", parseEther("5"), 1n]);
        const campaigns = await factory.read.getCampaigns();

        // Fund it fully
        const contributorCampaign = await getCampaignContract(campaigns[0], 1);
        await contributorCampaign.write.contribute([], { value: parseEther("6") });

        // Advance past deadline
        await advanceTime(2);

        // Non-creator tries to withdraw
        await assert.rejects(
            () => contributorCampaign.write.withdrawFunds(),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert: "${reason}"`);
                return /Only the campaign creator/.test(reason) || /Only the campaign creator/.test(err.message);
            }
        );
    });

    // ══════════════════════════════════════════════════════════
    // 4. REFUND TESTS
    // ══════════════════════════════════════════════════════════

    it("Should refund contributors if target not met", async function () {
        const factory = await deployCampaignFactory();
        const [, contributor] = await viem.getWalletClients();
        const publicClient = await viem.getPublicClient();

        console.log(`\n    [Test: Refund Contributors]`);

        await factory.write.createCampaign(["Refundable", "Description", parseEther("100"), 1n]);
        const campaigns = await factory.read.getCampaigns();

        const contributionAmount = parseEther("3");
        const contributorCampaign = await getCampaignContract(campaigns[0], 1);
        await contributorCampaign.write.contribute([], { value: contributionAmount });

        // Advance past deadline
        await advanceTime(2);

        const balanceBefore = await publicClient.getBalance({ address: contributor.account.address });
        await contributorCampaign.write.refund();
        const balanceAfter = await publicClient.getBalance({ address: contributor.account.address });

        console.log(`    Contributor balance increased: ${balanceAfter > balanceBefore}`);

        // After refund, contribution should be 0
        const remaining = await contributorCampaign.read.getContribution([contributor.account.address]);
        console.log(`    Remaining contribution: ${formatEther(remaining)} ETH`);

        assert.equal(remaining, 0n);
        assert.ok(balanceAfter > balanceBefore, "Contributor balance should increase after refund");
    });

    it("Should fail refund if target was met", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Fail Refund If Target Met]`);

        await factory.write.createCampaign(["No Refund", "Description", parseEther("5"), 1n]);
        const campaigns = await factory.read.getCampaigns();

        // Over-fund to meet target
        const contributorCampaign = await getCampaignContract(campaigns[0], 1);
        await contributorCampaign.write.contribute([], { value: parseEther("10") });

        // Advance past deadline
        await advanceTime(2);

        await assert.rejects(
            () => contributorCampaign.write.refund(),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert: "${reason}"`);
                return /Funding target was reached/.test(reason) || /Funding target was reached/.test(err.message);
            }
        );
    });

    it("Should fail to create a campaign with zero target", async function () {
        const factory = await deployCampaignFactory();

        console.log(`\n    [Test: Fail Create Campaign With Zero Target]`);

        await assert.rejects(
            () => factory.write.createCampaign(["Invalid", "Description", 0n, 30n]),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert: "${reason}"`);
                return /Funding target must be greater than 0/.test(reason) || /Funding target must be greater than 0/.test(err.message);
            }
        );
    });

    // ══════════════════════════════════════════════════════════
    // 5. REWARD TOKEN TESTS
    // ══════════════════════════════════════════════════════════

    it("Should deploy RewardToken and mint to contributors", async function () {
        const [, contributor] = await viem.getWalletClients();

        console.log(`\n    [Test: RewardToken Mint]`);

        const rewardToken = await viem.deployContract("RewardToken");

        // Rule: 1 token (1e18 units) per 1 ETH contributed
        const contributionInEth = parseEther("5");
        const rewardAmount = contributionInEth; // 1:1 mapping

        console.log(`    Minting ${formatEther(rewardAmount)} CFR tokens to contributor...`);
        await rewardToken.write.mint([contributor.account.address, rewardAmount]);

        const balance = await rewardToken.read.balanceOf([contributor.account.address]);
        const tokenName = await rewardToken.read.name();
        const tokenSymbol = await rewardToken.read.symbol();

        console.log(`    Token: ${tokenName} (${tokenSymbol})`);
        console.log(`    Contributor balance: ${formatEther(balance)} CFR`);

        assert.equal(balance, rewardAmount);
        assert.equal(tokenName, "CrowdfundReward");
        assert.equal(tokenSymbol, "CFR");
    });

    it("Should fail to mint zero reward tokens", async function () {
        const [, contributor] = await viem.getWalletClients();
        const rewardToken = await viem.deployContract("RewardToken");

        console.log(`\n    [Test: Fail Mint Zero Reward Tokens]`);

        await assert.rejects(
            () => rewardToken.write.mint([contributor.account.address, 0n]),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert: "${reason}"`);
                return /Mint amount must be greater than 0/.test(reason) || /Mint amount must be greater than 0/.test(err.message);
            }
        );
    });
});
