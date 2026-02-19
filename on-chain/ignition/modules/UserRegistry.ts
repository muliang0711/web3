import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UserRegistryModule = buildModule("UserRegistryModule", (m) => {
    const userRegistry = m.contract("UserRegistry");

    return { userRegistry };
});

export default UserRegistryModule;
