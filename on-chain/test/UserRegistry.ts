import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("UserRegistry", async function () {
    const { viem } = await network.connect();

    it("Should register a user", async function () {
        const userRegistry = await viem.deployContract("UserRegistry");
        const [owner] = await viem.getWalletClients();

        await userRegistry.write.register(["Alice"]);

        const user = await userRegistry.read.getUser([owner.account.address]);
        assert.equal(user.name, "Alice");
        assert.equal(user.isRegistered, true);
    });

    it("Should fail if name is empty", async function () {
        const userRegistry = await viem.deployContract("UserRegistry");

        await assert.rejects(
            () => userRegistry.write.register([""]),
            { message: /Username cannot be empty/ }
        );
    });

    it("Should fail if user already registered", async function () {
        const userRegistry = await viem.deployContract("UserRegistry");

        await userRegistry.write.register(["Alice"]);

        await assert.rejects(
            () => userRegistry.write.register(["Bob"]),
            { message: /User already registered/ }
        );
    });
});
