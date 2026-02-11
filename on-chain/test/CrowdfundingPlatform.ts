import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

describe("CrowdfundingPlatform", async function () {
    const { viem } = await network.connect();

    // ============================================================
    //  Helper: deploy a fresh platform instance
    // ============================================================
    async function deployPlatform() {
        const wallets = await viem.getWalletClients();
        const platform = await viem.deployContract("CrowdfundingPlatform");
        const rewardToken = await viem.deployContract("RewardToken", [
            platform.address,
        ]);
        return { platform, rewardToken, wallets };
    }

    // ============================================================
    //  createCampaign
    // ============================================================
    describe("createCampaign", async function () {
        it("Should create a campaign and increment count", async function () {
            const { platform } = await deployPlatform();

            await platform.write.createCampaign([
                "Test Campaign",
                "A test",
                parseEther("10"),
                BigInt(30),
            ]);

            const count = await platform.read.campaignCount();
            assert.equal(count, BigInt(1));
        });

        it("Should store correct campaign data", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "My Campaign",
                "Description here",
                parseEther("5"),
                BigInt(7),
            ]);

            const campaign = await platform.read.getCampaign([BigInt(1)]);
            // campaign returns tuple: (creator, title, description, goal, deadline, totalRaised, status, fundsWithdrawn)
            assert.equal(
                getAddress(campaign[0]),
                getAddress(wallets[0].account.address)
            );
            assert.equal(campaign[1], "My Campaign");
            assert.equal(campaign[2], "Description here");
            assert.equal(campaign[3], parseEther("5"));
            assert.equal(campaign[5], BigInt(0)); // totalRaised
            assert.equal(campaign[6], 0); // status Active
            assert.equal(campaign[7], false); // fundsWithdrawn
        });

        it("Should emit CampaignCreated event", async function () {
            const { platform } = await deployPlatform();
            const publicClient = await viem.getPublicClient();

            const txHash = await platform.write.createCampaign([
                "Event Test",
                "Testing events",
                parseEther("1"),
                BigInt(10),
            ]);

            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash,
            });
            assert.ok(receipt.logs.length > 0, "Should have emitted events");
        });

        it("Should reject zero goal", async function () {
            const { platform } = await deployPlatform();

            await assert.rejects(
                async () => {
                    await platform.write.createCampaign([
                        "Bad Campaign",
                        "No goal",
                        BigInt(0),
                        BigInt(30),
                    ]);
                }
            );
        });

        it("Should reject zero duration", async function () {
            const { platform } = await deployPlatform();

            await assert.rejects(
                async () => {
                    await platform.write.createCampaign([
                        "Bad Campaign",
                        "No duration",
                        parseEther("10"),
                        BigInt(0),
                    ]);
                }
            );
        });
    });

    // ============================================================
    //  contribute
    // ============================================================
    describe("contribute", async function () {
        it("Should accept contributions", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Contrib Test",
                "Test",
                parseEther("10"),
                BigInt(30),
            ]);

            await platform.write.contribute([BigInt(1)], {
                value: parseEther("2"),
                account: wallets[1].account,
            });

            const contribution = await platform.read.getContribution([
                BigInt(1),
                wallets[1].account.address,
            ]);
            assert.equal(contribution, parseEther("2"));
        });

        it("Should update totalRaised", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Total Test",
                "Test",
                parseEther("10"),
                BigInt(30),
            ]);

            await platform.write.contribute([BigInt(1)], {
                value: parseEther("3"),
                account: wallets[1].account,
            });

            await platform.write.contribute([BigInt(1)], {
                value: parseEther("2"),
                account: wallets[2].account,
            });

            const campaign = await platform.read.getCampaign([BigInt(1)]);
            assert.equal(campaign[5], parseEther("5")); // totalRaised
        });

        it("Should change status to Success when goal reached", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Goal Test",
                "Test",
                parseEther("5"),
                BigInt(30),
            ]);

            // Contribute exactly the goal
            await platform.write.contribute([BigInt(1)], {
                value: parseEther("5"),
                account: wallets[1].account,
            });

            const campaign = await platform.read.getCampaign([BigInt(1)]);
            assert.equal(campaign[6], 1); // status = Success
        });

        it("Should reject zero contribution", async function () {
            const { platform } = await deployPlatform();

            await platform.write.createCampaign([
                "Zero Test",
                "Test",
                parseEther("10"),
                BigInt(30),
            ]);

            await assert.rejects(
                async () => {
                    await platform.write.contribute([BigInt(1)], {
                        value: BigInt(0),
                    });
                }
            );
        });

        it("Should reject contribution to non-existent campaign", async function () {
            const { platform } = await deployPlatform();

            await assert.rejects(
                async () => {
                    await platform.write.contribute([BigInt(999)], {
                        value: parseEther("1"),
                    });
                }
            );
        });

        it("Should emit ContributionReceived event", async function () {
            const { platform, wallets } = await deployPlatform();
            const publicClient = await viem.getPublicClient();

            await platform.write.createCampaign([
                "Event Contrib",
                "Test",
                parseEther("10"),
                BigInt(30),
            ]);

            const txHash = await platform.write.contribute([BigInt(1)], {
                value: parseEther("1"),
                account: wallets[1].account,
            });

            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash,
            });
            assert.ok(receipt.logs.length > 0, "Should have emitted events");
        });
    });

    // ============================================================
    //  withdrawFunds
    // ============================================================
    describe("withdrawFunds", async function () {
        it("Should allow creator to withdraw from successful campaign", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Withdraw Test",
                "Test",
                parseEther("5"),
                BigInt(30),
            ]);

            // Fund the campaign fully
            await platform.write.contribute([BigInt(1)], {
                value: parseEther("5"),
                account: wallets[1].account,
            });

            // Creator withdraws
            await platform.write.withdrawFunds([BigInt(1)]);

            const campaign = await platform.read.getCampaign([BigInt(1)]);
            assert.equal(campaign[7], true); // fundsWithdrawn
        });

        it("Should reject withdrawal by non-creator", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Non-Creator Test",
                "Test",
                parseEther("5"),
                BigInt(30),
            ]);

            await platform.write.contribute([BigInt(1)], {
                value: parseEther("5"),
                account: wallets[1].account,
            });

            await assert.rejects(
                async () => {
                    await platform.write.withdrawFunds([BigInt(1)], {
                        account: wallets[1].account,
                    });
                }
            );
        });

        it("Should reject double withdrawal", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Double Test",
                "Test",
                parseEther("5"),
                BigInt(30),
            ]);

            await platform.write.contribute([BigInt(1)], {
                value: parseEther("5"),
                account: wallets[1].account,
            });

            await platform.write.withdrawFunds([BigInt(1)]);

            await assert.rejects(
                async () => {
                    await platform.write.withdrawFunds([BigInt(1)]);
                }
            );
        });

        it("Should reject withdrawal from non-successful campaign", async function () {
            const { platform } = await deployPlatform();

            await platform.write.createCampaign([
                "Not Funded",
                "Test",
                parseEther("100"),
                BigInt(30),
            ]);

            await assert.rejects(
                async () => {
                    await platform.write.withdrawFunds([BigInt(1)]);
                }
            );
        });
    });

    // ============================================================
    //  checkAndUpdateStatus
    // ============================================================
    describe("checkAndUpdateStatus", async function () {
        it("Should mark campaign as Success when goal met", async function () {
            const { platform, wallets } = await deployPlatform();

            await platform.write.createCampaign([
                "Status Test",
                "Test",
                parseEther("3"),
                BigInt(30),
            ]);

            await platform.write.contribute([BigInt(1)], {
                value: parseEther("3"),
                account: wallets[1].account,
            });

            await platform.write.checkAndUpdateStatus([BigInt(1)]);

            const campaign = await platform.read.getCampaign([BigInt(1)]);
            assert.equal(campaign[6], 1); // Success
        });

        it("Should not change active campaign status prematurely", async function () {
            const { platform } = await deployPlatform();

            await platform.write.createCampaign([
                "Active Test",
                "Test",
                parseEther("100"),
                BigInt(30),
            ]);

            await platform.write.checkAndUpdateStatus([BigInt(1)]);

            const campaign = await platform.read.getCampaign([BigInt(1)]);
            assert.equal(campaign[6], 0); // Still Active
        });
    });

    // ============================================================
    //  RewardToken
    // ============================================================
    describe("RewardToken", async function () {
        it("Should set platform address correctly", async function () {
            const { platform, rewardToken } = await deployPlatform();

            const storedPlatform = await rewardToken.read.platform();
            assert.equal(
                getAddress(storedPlatform),
                getAddress(platform.address)
            );
        });

        it("Should have correct name and symbol", async function () {
            const { rewardToken } = await deployPlatform();

            const name = await rewardToken.read.name();
            const symbol = await rewardToken.read.symbol();
            assert.equal(name, "CrowdfundReward");
            assert.equal(symbol, "CFRD");
        });

        it("Should reject minting from non-platform address", async function () {
            const { rewardToken, wallets } = await deployPlatform();

            await assert.rejects(
                async () => {
                    await rewardToken.write.distributeRewards(
                        [wallets[1].account.address, BigInt(1), parseEther("100")],
                        { account: wallets[1].account }
                    );
                }
            );
        });
    });

    // ============================================================
    //  Multiple campaigns
    // ============================================================
    describe("Multiple Campaigns", async function () {
        it("Should handle multiple campaigns independently", async function () {
            const { platform, wallets } = await deployPlatform();

            // Create 3 campaigns
            for (let i = 0; i < 3; i++) {
                await platform.write.createCampaign([
                    `Campaign ${i + 1}`,
                    `Desc ${i + 1}`,
                    parseEther("5"),
                    BigInt(30),
                ]);
            }

            assert.equal(await platform.read.campaignCount(), BigInt(3));

            // Fund only campaign 2
            await platform.write.contribute([BigInt(2)], {
                value: parseEther("5"),
                account: wallets[1].account,
            });

            // Campaign 1 should still be active
            const c1 = await platform.read.getCampaign([BigInt(1)]);
            assert.equal(c1[6], 0);

            // Campaign 2 should be successful
            const c2 = await platform.read.getCampaign([BigInt(2)]);
            assert.equal(c2[6], 1);

            // Campaign 3 should still be active
            const c3 = await platform.read.getCampaign([BigInt(3)]);
            assert.equal(c3[6], 0);
        });
    });
});
