// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract StateManage {
    /// @notice Represents a key-value pair with version control
    struct KeyValue {
        bytes value; // The value associated with the key
        uint256 version; // The version of the key-value pair
    }

    /// @notice Represents a namespace with owners and key-value pairs
    struct NameSpaces {
        uint256 ownerCount; // Count of owners in the namespace
        mapping(address => bool) owners; // Mapping of owners in the namespace
        mapping(string => KeyValue) kvs; // Mapping of key-value pairs in the namespace
    }

    // Mapping of namespace identifiers to their respective namespaces
    mapping(string => NameSpaces) private nameSpaces;

    /// @notice Custom errors for more efficient gas usage
    error Unauthorized(); // Thrown when an unauthorized action is attempted
    error NameSpacesAlreadyExists(); // Thrown when a namespace already exists
    error NameSpacesNotExists(); // Thrown when a namespace not exists

    error CannotRemoveSelf(); // Thrown when an owner tries to remove themselves
    error VersionMismatch(); // Thrown when a version mismatch occurs during an update

    /// @notice Modifier to restrict access to namespace owners
    modifier onlyNamespaceOwner(string memory space) {
        if (!nameSpaces[space].owners[msg.sender]) revert Unauthorized();
        _;
    }

    /// @notice Creates a new namespace
    /// @param space The identifier of the namespace to create
    function createNameSpace(string memory space) external {
        require(bytes(space).length > 0, "Namespace cannot be empty");
        // Ensure the sender has a balance greater than 0
        require(msg.sender.balance > 0, "Need to have some balance");

        NameSpaces storage group = nameSpaces[space];
        if (group.ownerCount > 0) {
            revert NameSpacesAlreadyExists();
        }

        // Set the creator as the owner and initialize the owner count
        group.owners[msg.sender] = true;
        group.ownerCount = 1;
    }

    /// @notice Checks if an address is an owner of a namespace
    /// @param space The namespace to check
    /// @param owner The address to verify
    /// @return True if the address is an owner, false otherwise
    function checkNamespaceOwner(string memory space, address owner)
    external
    view
    returns (bool)
    {
        return nameSpaces[space].owners[owner];
    }

    /// @notice Adds a new owner to the namespace
    /// @param space The namespace to modify
    /// @param newOwner The address to add as an owner
    function addNamespaceOwner(string memory space, address newOwner) external onlyNamespaceOwner(space) {
        require(newOwner != address(0), "Invalid address");
        require(newOwner.balance > 0, "New owner must have a positive balance");
        require(bytes(space).length > 0, "Namespace cannot be empty");

        nameSpaces[space].owners[newOwner] = true;
        nameSpaces[space].ownerCount += 1;
    }

    /// @notice Removes an owner from the namespace
    /// @param space The namespace to modify
    /// @param ownerToRemove The address to remove as an owner
    function removeNamespaceOwner(string memory space, address ownerToRemove) external onlyNamespaceOwner(space) {
        if (ownerToRemove == msg.sender) revert CannotRemoveSelf();
        delete nameSpaces[space].owners[ownerToRemove];
        nameSpaces[space].ownerCount -= 1;
    }

    /// @notice Writes a key-value pair with version control
    /// @param space The namespace to modify
    /// @param key The key to write
    /// @param value The value to associate with the key
    /// @param expectedVersion The expected version for the key
    function write(
        string memory space,
        string memory key,
        bytes memory value,
        uint256 expectedVersion
    ) external onlyNamespaceOwner(space) {

        require(bytes(key).length > 0, "Key cannot be empty");

        KeyValue storage kv = nameSpaces[space].kvs[key];
        if (kv.version != expectedVersion) revert VersionMismatch();
        kv.value = value;
        kv.version++; // Increment the version after a successful update
    }

    /// @notice Reads a key-value pair
    /// @param space The namespace to query
    /// @param key The key to read
    /// @return value The value associated with the key
    /// @return version The version of the key-value pair
    function read(string memory space, string memory key)
    external
    view
    onlyNamespaceOwner(space)
    returns (bytes memory value, uint256 version)
    {
        KeyValue storage kv = nameSpaces[space].kvs[key];
        return (kv.value, kv.version);
    }

    /// @notice Reads multiple key-value pairs
    /// @param space The namespace to query
    /// @param keys The keys to read
    /// @return values The values associated with the keys
    /// @return versions The versions of the key-value pairs
    function readKVs(string memory space, string[] memory keys)
    external
    view
    onlyNamespaceOwner(space)
    returns (bytes[] memory values, uint256[] memory versions)
    {
        values = new bytes[](keys.length);
        versions = new uint256[](keys.length);

        NameSpaces storage group = nameSpaces[space];
        for (uint256 i = 0; i < keys.length; i++) {
            KeyValue storage kv = group.kvs[keys[i]];
            if (bytes(kv.value).length == 0) {
                // 如果值为空，设置默认值
                values[i] = "";
            } else {
                values[i] = kv.value;
            }
            versions[i] = kv.version;
        }
    }

    /// @notice Writes multiple key-value pairs with version control
    /// @param space The namespace to modify
    /// @param keys The keys to write
    /// @param values The values to associate with the keys
    /// @param expectedVersions The expected versions for the keys
    function writeKVs(
        string memory space,
        string[] memory keys,
        bytes[] memory values,
        uint256[] memory expectedVersions
    ) external onlyNamespaceOwner(space) {
        require(keys.length == values.length && keys.length == expectedVersions.length, "Invalid input length");

        NameSpaces storage group = nameSpaces[space];
        for (uint256 i = 0; i < keys.length; i++) {
            KeyValue storage kv = group.kvs[keys[i]];
            if (kv.version != expectedVersions[i]) revert VersionMismatch();
            kv.value = values[i];
            kv.version += 1;
        }
    }
}
