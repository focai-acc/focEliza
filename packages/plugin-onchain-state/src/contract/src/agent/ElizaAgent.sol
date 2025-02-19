// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IElizaAgent.sol";
import "../utils/EnvironmentManager.sol";
import "hardhat/console.sol";

contract ElizaAgent is IElizaAgent, EnvironmentManager {
    using Strings for string;

    uint256 public constant MAX_STATE_DATA_SIZE = 256 * 1024; // 256kb

    address public creator;
    AgentInfo private info;
    // Mapping: key => version => data
    mapping(string => mapping(uint64 => bytes)) public stateData;
    // Mapping: key => latest version
    mapping(string => uint64) public stateDataVersions;

    function initialize(
        address _creator,
        AgentInfo calldata _info
    ) external {
        require(creator == address(0), "Already initialized");
        creator = _creator;
        _grantRole(DEFAULT_ADMIN_ROLE, _creator);
        _grantRole(OPERATOR_ROLE, _creator);
        info = _info;
    }

    function getInfo() external view returns(AgentInfo memory) {
        return info;
    }

    function setCharacterURI(string calldata _uri) external onlyRole(OPERATOR_ROLE) {
        emit CharacterURIChanged(_msgSender(), info.characterURI, _uri);
        info.characterURI = _uri;
    }

    function recordDBData(
        string calldata version,
        string calldata table,
        string[] calldata ids,
        bytes[] calldata contents
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        if (ids.length > MAX_BATCH_SIZE || ids.length != contents.length) {
            revert InvalidInput();
        }

        for(uint256 i = 0; i < ids.length; i++) {
            emit DBDataRecorded(_msgSender(), version, table, ids[i], contents[i]);
        }
    }

    function compareBytes(bytes memory a, bytes memory b) public pure returns (bool) {
        uint minLength = a.length < b.length ? a.length : b.length;
        for (uint i = 0; i < minLength; i++) {
            if (a[i] < b[i]) return true;
            if (a[i] > b[i]) return false;
        }
        return a.length < b.length;
    }


    function storeStateData(
        string calldata key,
        bytes calldata data,
        uint64 version
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        if (data.length > MAX_STATE_DATA_SIZE) {
            revert ExcessiveDataSize();
        }

        uint64 currentVersion = stateDataVersions[key];
        if (version < currentVersion) {
            revert InvalidVersion();
        }

        emit StateDataChanged(
            _msgSender(),
            key,
            stateData[key][version],
            data,
            version
        );

        stateData[key][version] = data;
        if (version > currentVersion) {
            stateDataVersions[key] = version;
        }
    }

    function getStateData(
        string calldata key,
        uint64 version
    ) external view returns (bytes memory) {
        return stateData[key][version];
    }

    function getLatestStateData(
        string calldata key
    ) external view returns (bytes memory, uint64) {
        uint64 version = stateDataVersions[key];
        return (stateData[key][version], version);
    }

    function getId() external view returns (bytes32) {
        return info.agentId;
    }

    function getCreator() external view returns (address) {
        return creator;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
