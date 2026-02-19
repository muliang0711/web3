import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("UserRegistry", async function () {
    const { viem } = await network.connect();

    // Helper to extract the actual revert reason from Viem errors
    const getRevertReason = (err: any) => {
        // Viem errors often have the real reason in 'details' or nested in 'walk'
        // If it's a contract revert, the reason is usually in the error message itself 
        // but often prefixed with generic RPC text.
        if (err.details) return err.details;
        if (err.shortMessage) return err.shortMessage;
        return err.message;
    };

    it("Should register a user", async function () {
        const userRegistry = await viem.deployContract("UserRegistry");
        const [owner] = await viem.getWalletClients();
        const testName = "Alice";

        console.log(`\n    [Test: Register User]`);
        console.log(`    Input Name: ${testName}`);

        await userRegistry.write.register([testName]);

        const user = await userRegistry.read.getUser([owner.account.address]);
        console.log(`    Outcome Result -> Name: ${user.name}, Registered: ${user.isRegistered}`);

        assert.equal(user.name, testName);
        assert.equal(user.isRegistered, true);
    });

    it("Should fail if name is empty", async function () {
        const userRegistry = await viem.deployContract("UserRegistry");
        const testName = "";

        console.log(`\n    [Test: Fail if name is empty]`);
        console.log(`    Input Name: "${testName}"`);

        await assert.rejects(
            () => userRegistry.write.register([testName]),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert Reason found: "${reason}"`);
                return /Username cannot be empty/.test(reason) || /Username cannot be empty/.test(err.message);
            }
        );
    });

    it("Should fail if user already registered", async function () {
        const userRegistry = await viem.deployContract("UserRegistry");
        const testName1 = "Alice";
        const testName2 = "Bob";

        console.log(`\n    [Test: Fail if already registered]`);
        console.log(`    Step 1: Registering ${testName1}...`);
        await userRegistry.write.register([testName1]);

        console.log(`    Step 2: Attempting to register ${testName2} from same wallet...`);
        await assert.rejects(
            () => userRegistry.write.register([testName2]),
            (err: any) => {
                const reason = getRevertReason(err);
                console.log(`    Expected Revert Reason found: "${reason}"`);
                return /User already registered/.test(reason) || /User already registered/.test(err.message);
            }
        );
    });
});
