import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Project", async function () {
    const { viem } = await network.connect();

    it("Should have the default name", async function () {
        const project = await viem.deployContract("Project");
        const name = await project.read.name();
        assert.equal(name, "New Project");
    });

    it("Should update the name", async function () {
        const project = await viem.deployContract("Project");
        await project.write.updateName(["Clean Slate"]);
        const name = await project.read.name();
        assert.equal(name, "Clean Slate");
    });
});
