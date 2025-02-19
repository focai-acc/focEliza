// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SpaceEnvironmentManager
 * @dev Abstract contract for managing environment variables per space
 */
abstract contract SpaceEnvironmentManager is AccessControl, Pausable, ReentrancyGuard {
    using Strings for string;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant MAX_ENV_KEY_LENGTH = 32;
    uint256 public constant MAX_ENV_VALUE_LENGTH = 256;

    // Mapping from space to env mapping
    mapping(string => mapping(string => string)) public spaceEnvs;
    // Mapping from space to env keys array
    mapping(string => string[]) public spaceEnvKeys;
    // Mapping from space to key indices
    mapping(string => mapping(string => uint256)) private spaceEnvKeyIndices;

    error InvalidInput();
    error EnvNotFound();
    error UnauthorizedAccess();

    event EnvChanged(string indexed space, address indexed operator, string indexed key, string fromValue, string toValue);
    event EnvRemoved(string indexed space, address indexed operator, string indexed key);

    modifier validEnvKey(string calldata key) {
        if (bytes(key).length == 0 || bytes(key).length > MAX_ENV_KEY_LENGTH) {
            revert InvalidInput();
        }
        _;
    }

    modifier validEnvValue(string calldata value) {
        if (bytes(value).length > MAX_ENV_VALUE_LENGTH) {
            revert InvalidInput();
        }
        _;
    }

    modifier onlySpaceOwner(string calldata space) {
        if (!_isSpaceOwner(space, _msgSender())) {
            revert UnauthorizedAccess();
        }
        _;
    }

    // This function must be implemented by the contract that inherits this one
    function _isSpaceOwner(string calldata space, address account) internal virtual returns (bool);

    function getSpaceEnv(string calldata space, string calldata key) external view returns (string memory) {
        return spaceEnvs[space][key];
    }

    function getAllSpaceEnvs(string calldata space) external view returns (string[] memory keys, string[] memory values) {
        keys = spaceEnvKeys[space];
        values = new string[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            values[i] = spaceEnvs[space][keys[i]];
        }
    }

    function setSpaceEnv(
        string calldata space,
        string calldata key,
        string calldata value
    ) external onlyRole(OPERATOR_ROLE) onlySpaceOwner(space) {
        _setSpaceEnv(space, key, value);
    }

    function setSpaceEnvs(
        string calldata space,
        string[] calldata keys,
        string[] calldata values
    ) external onlyRole(OPERATOR_ROLE) onlySpaceOwner(space) whenNotPaused nonReentrant {
        _setSpaceEnvs(space, keys, values);
    }

    function removeSpaceEnv(
        string calldata space,
        string calldata key
    ) external onlyRole(OPERATOR_ROLE) onlySpaceOwner(space) {
        _removeSpaceEnv(space, key);
    }

    function _setSpaceEnv(
        string calldata space,
        string calldata key,
        string calldata value
    ) internal validEnvKey(key) validEnvValue(value) {
        if (spaceEnvKeyIndices[space][key] == 0 && spaceEnvKeys[space].length == 0) {
            spaceEnvKeys[space].push(key);
            spaceEnvKeyIndices[space][key] = 0;
        } else if (spaceEnvKeyIndices[space][key] == 0) {
            spaceEnvKeys[space].push(key);
            spaceEnvKeyIndices[space][key] = spaceEnvKeys[space].length - 1;
        }

        emit EnvChanged(space, _msgSender(), key, spaceEnvs[space][key], value);
        spaceEnvs[space][key] = value;
    }

    function _setSpaceEnvs(
        string calldata space,
        string[] calldata keys,
        string[] calldata values
    ) internal {
        if (keys.length != values.length || keys.length > MAX_BATCH_SIZE) {
            revert InvalidInput();
        }

        for (uint256 i = 0; i < keys.length; i++) {
            if (bytes(keys[i]).length == 0 ||
                bytes(keys[i]).length > MAX_ENV_KEY_LENGTH ||
                bytes(values[i]).length > MAX_ENV_VALUE_LENGTH) {
                revert InvalidInput();
            }
            _setSpaceEnv(space, keys[i], values[i]);
        }
    }

    function _removeSpaceEnv(string calldata space, string calldata key) internal {
        uint256 index = spaceEnvKeyIndices[space][key];
        if (index == 0 && !key.equal(spaceEnvKeys[space][0])) {
            revert EnvNotFound();
        }

        // Delete the key-value pair
        string memory lastKey = spaceEnvKeys[space][spaceEnvKeys[space].length - 1];
        spaceEnvKeys[space][index] = lastKey;
        spaceEnvKeyIndices[space][lastKey] = index;
        spaceEnvKeys[space].pop();
        delete spaceEnvKeyIndices[space][key];
        delete spaceEnvs[space][key];

        emit EnvRemoved(space, _msgSender(), key);
    }
}
