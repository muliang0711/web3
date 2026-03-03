// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// HY : able to explain how it work
contract UserRegistry {
    // 1. struct :
    struct User {
        string name;
        bool isRegistered;
    }

    // 2.state variable :
    mapping(address => User) public users;

    // 3. events :
    event UserRegistered(address indexed userAddress, string username);

    // 4. functions :
    function register(string memory _name) public {
        // modifier :
        require(bytes(_name).length > 0, "Username cannot be empty");
        require(!users[msg.sender].isRegistered, "User already registered");

        // logic :
        users[msg.sender] = User(_name, true);
        emit UserRegistered(msg.sender, _name);
    }

    function getUser(address _userAddress) public view returns (User memory) {
        return users[_userAddress];
    }
}
