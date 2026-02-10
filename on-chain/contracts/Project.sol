// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Project {
    string public name = "New Project";

    event Updated(address indexed user, string newValue);

    function updateName(string memory _newName) public {
        name = _newName;
        emit Updated(msg.sender, _newName);
    }
}
