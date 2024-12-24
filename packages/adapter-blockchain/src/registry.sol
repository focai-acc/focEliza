// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HashRegistry {
    // Mapping to store the UUID (key) and corresponding hash (value)
    mapping(string => bytes32) private registry;

    // Mapping to store the owner of each key
    mapping(string => address) private keyOwners;

    // Event to log registration, update, or deletion
    event Registered(string indexed key, bytes32 indexed hash, address indexed owner);
    event Deleted(string indexed key);
    event OwnershipTransferred(string indexed key, address indexed previousOwner, address indexed newOwner);

    // Modifier to ensure the user can only modify their own key
    modifier onlyKeyOwner(string memory key) {
        require(keyOwners[key] == msg.sender, "Not the owner of this key");
        _;
    }

    // Register or update a key with its associated hash
    function registerOrUpdate(string memory key, bytes32 hash) public {
        // If the key is new, assign ownership to the sender
        if (keyOwners[key] == address(0)) {
            keyOwners[key] = msg.sender;
        }

        // Ensure the sender is the owner of the key
        require(keyOwners[key] == msg.sender, "Not the owner of this key");

        registry[key] = hash;
        emit Registered(key, hash, msg.sender);
    }

    // Delete a key from the registry
    function deleteKey(string memory key) public onlyKeyOwner(key) {
        require(registry[key] != bytes32(0), "Key does not exist");
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

    // Retrieve the hash associated with a given key
    function getHash(string memory key) public view returns (bytes32) {
        return registry[key];
    }

    // Check if a key exists in the registry
    function keyExists(string memory key) public view returns (bool) {
        return registry[key] != bytes32(0);
    }

    // Retrieve the owner of a given key
    function getKeyOwner(string memory key) public view returns (address) {
        return keyOwners[key];
    }
}
