// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

struct AgentInfo {
    string space;
    bytes32 agentId;
    string name;
    string description;
    string characterURI;
}

interface IElizaAgent {
    error ExcessiveDataSize();
    error InvalidVersion();

    event AgentStatusChanged(address indexed operator, bool from, bool to);
    event CharacterURIChanged(address indexed operator, string from, string to);
    event DBDataRecorded(address indexed operator, string indexed version, string indexed table, string id, bytes content);
    event StateDataChanged(address indexed operator, string indexed key, bytes from, bytes to, uint64 version);

    function initialize(
        address owner,
        address operator,
        AgentInfo calldata _info
    ) external;

    function getInfo() external view returns(AgentInfo memory);

    function pause() external;

    function unpause() external;

    function getId() external view returns (bytes32);

    function getCreator() external view returns (address);

    function setCharacterURI(
        string calldata _uri
    ) external;

    function recordDBData(
        string calldata version,
        string calldata table,
        string[] calldata ids,
        bytes[] calldata contents
    ) external;

    function getStateData(
        string calldata key,
        uint64 version
    ) external view returns (bytes memory);

    function getLatestStateData(
        string calldata key
    ) external view returns (bytes memory, uint64);

    function storeStateData(
        string calldata key,
        bytes calldata data,
        uint64 version
    ) external;
}
