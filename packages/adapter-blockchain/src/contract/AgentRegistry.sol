// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AgentRegistry {
    // Mapping to store the UUID (key) and corresponding custom value (value)
    mapping(string => string) private registry;

    // Mapping to store the owner of each key
    mapping(string => address) private keyOwners;

    // Event to log registration, update, or deletion
    event Registered(string indexed key, string value, address indexed owner);
    event Deleted(string indexed key);
    event OwnershipTransferred(string indexed key, address indexed previousOwner, address indexed newOwner);

    // Modifier to ensure the user can only modify their own key
    modifier onlyKeyOwner(string memory key) {
        require(keyOwners[key] == msg.sender, "Not the owner of this key");
        _;
    }

    // Register or update a key with its associated custom value
    function registerOrUpdate(string memory key, string memory value) public {
        // If the key is new, assign ownership to the sender
        if (keyOwners[key] == address(0)) {
            keyOwners[key] = msg.sender;
        }

        // Ensure the sender is the owner of the key
        require(keyOwners[key] == msg.sender, "Not the owner of this key");

        registry[key] = value;
        emit Registered(key, value, msg.sender);
    }

    // Delete a key from the registry
    function deleteKey(string memory key) public onlyKeyOwner(key) {
        require(bytes(registry[key]).length != 0, "Key does not exist");
        delete registry[key];
        delete keyOwners[key];
        emit Deleted(key);
    }

    // Transfer ownership of a key to another address
    function transferOwnership(string memory key, address newOwner) public onlyKeyOwner(key) {
        require(newOwner != address(0), "New owner cannot be the zero address");
        address previousOwner = keyOwners[key];
        keyOwners[key] = newOwner;
        emit OwnershipTransferred(key, previousOwner, newOwner);
    }

    // Retrieve the value associated with a given key
    function getValue(string memory key) public view returns (string memory) {
        return registry[key];
    }

    // Check if a key exists in the registry
    function keyExists(string memory key) public view returns (bool) {
        return bytes(registry[key]).length != 0;
    }

    // Retrieve the owner of a given key
    function getKeyOwner(string memory key) public view returns (address) {
        return keyOwners[key];
    }
}
