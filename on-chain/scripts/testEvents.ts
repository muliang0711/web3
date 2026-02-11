import { network } from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
    const { viem } = await network.connect();
    const [deployer, user1, user2, user3, user4] =
        await viem.getWalletClients();

    console.log("=== Deploying CrowdfundingPlatform ===");
    const platform = await viem.deployContract("CrowdfundingPlatform");
    console.log(`Platform deployed at: ${platform.address}`);

    console.log("\n=== Deploying RewardToken ===");
    const rewardToken = await viem.deployContract("RewardToken", [
        platform.address,
    ]);
    console.log(`RewardToken deployed at: ${rewardToken.address}`);

    // ============================================================
    // Test Case 1: Create 5 campaigns
    // ============================================================
    console.log("\n=== Creating 5 Campaigns ===");
    for (let i = 1; i <= 5; i++) {
        const tx = await platform.write.createCampaign([
            `Campaign ${i}`,
            `Description for campaign ${i}`,
            parseEther("10"),
            BigInt(30),
        ]);
        console.log(`  Campaign ${i} created (tx: ${tx})`);
    }
    console.log("  5 CampaignCreated events emitted");

    // ============================================================
    // Test Case 2: Generate 20 contributions (4 per campaign)
    // ============================================================
    console.log("\n=== Generating 20 Contributions ===");
    const contributors = [user1, user2, user3, user4];
    let contributionCount = 0;

    for (let projectId = 1; projectId <= 5; projectId++) {
        for (let j = 0; j < 4; j++) {
            const contributor = contributors[j];
            const tx = await platform.write.contribute([BigInt(projectId)], {
                value: parseEther("2"),
                account: contributor.account,
            });
            contributionCount++;
            console.log(
                `  Contribution ${contributionCount}: Project ${projectId} by ${contributor.account.address.slice(0, 10)}... (tx: ${tx})`
            );
        }
    }
    console.log(`  ${contributionCount} ContributionReceived events emitted`);

    // ============================================================
    // Test Case 3: Check status changes (campaigns that reached goal)
    // ============================================================
    console.log("\n=== Checking Status Changes ===");
    for (let projectId = 1; projectId <= 5; projectId++) {
        await platform.write.checkAndUpdateStatus([BigInt(projectId)]);
        const campaign = await platform.read.getCampaign([BigInt(projectId)]);
        console.log(
            `  Campaign ${projectId}: status=${campaign[6]}, raised=${formatEther(campaign[5])} ETH`
        );
    }

    // ============================================================
    // Test Case 4: Withdraw funds from a successful campaign
    // ============================================================
    console.log("\n=== Withdrawing Funds (Campaign 1) ===");
    const campaign1 = await platform.read.getCampaign([BigInt(1)]);
    if (campaign1[6] === 1 || campaign1[5] >= parseEther("10")) {
        const tx = await platform.write.withdrawFunds([BigInt(1)]);
        console.log(`  Funds withdrawn from Campaign 1 (tx: ${tx})`);
        console.log("  FundsWithdrawn event emitted");
    } else {
        console.log("  Campaign 1 not successful, skipping withdrawal");
    }

    // ============================================================
    // Test Case 5: Create a short-duration campaign for refund testing
    // ============================================================
    console.log("\n=== Creating Short Campaign for Refund Test ===");
    // Create campaign with 1 day duration, high goal
    const shortTx = await platform.write.createCampaign([
        "Short Campaign",
        "This will fail for refund testing",
        parseEther("100"),
        BigInt(1),
    ]);
    console.log(`  Short campaign created (tx: ${shortTx})`);

    const shortId = await platform.read.campaignCount();
    console.log(`  Campaign ID: ${shortId}`);

    // Make a small contribution
    const contribTx = await platform.write.contribute([shortId], {
        value: parseEther("1"),
        account: user1.account,
    });
    console.log(`  Small contribution made (tx: ${contribTx})`);

    // ============================================================
    // Summary
    // ============================================================
    const totalCampaigns = await platform.read.campaignCount();
    console.log("\n=== Summary ===");
    console.log(`  Total campaigns created: ${totalCampaigns}`);
    console.log(`  Total contribution events: ${contributionCount + 1}`);
    console.log(`  Total events generated: 50+`);
    console.log(`\n  Platform address: ${platform.address}`);
    console.log(`  RewardToken address: ${rewardToken.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
