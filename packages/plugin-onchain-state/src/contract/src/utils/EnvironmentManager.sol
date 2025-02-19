// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EnvironmentManager
 * @dev Abstract contract for managing environment variables
 */
abstract contract EnvironmentManager is AccessControl, Pausable, ReentrancyGuard {
    using Strings for string;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant MAX_ENV_KEY_LENGTH = 32;
    uint256 public constant MAX_ENV_VALUE_LENGTH = 256;

    mapping(string => string) public envs;
    string[] public envKeys;
    mapping(string => uint256) private envKeyIndices;

    error InvalidInput();
    error EnvNotFound();

    event EnvChanged(address indexed operator, string indexed key, string fromValue, string toValue);
    event EnvRemoved(address indexed operator, string indexed key);

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

    function getEnv(string calldata _key) external view returns (string memory) {
        return envs[_key];
    }

    function getAllEnvs() external view returns (string[] memory keys, string[] memory values)  {
        keys = envKeys;
        values = new string[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            values[i] = envs[keys[i]];
        }
    }

    function setEnv(
        string calldata key,
        string calldata value
    ) external virtual onlyRole(OPERATOR_ROLE) {
        _setEnv(key, value);
    }

    function setEnvs(
        string[] calldata keys,
        string[] calldata values
    ) external virtual onlyRole(OPERATOR_ROLE) whenNotPaused nonReentrant {
        _setEnvs(keys, values);
    }

    function removeEnv(string calldata key) external virtual onlyRole(OPERATOR_ROLE) {
        _removeEnv(key);
    }

    function _setEnv(
        string calldata key,
        string calldata value
    ) internal validEnvKey(key) validEnvValue(value) {
        if (envKeyIndices[key] == 0 && envKeys.length == 0) {
            envKeys.push(key);
            envKeyIndices[key] = 0;
        } else if (envKeyIndices[key] == 0) {
            envKeys.push(key);
            envKeyIndices[key] = envKeys.length - 1;
        }

        emit EnvChanged(_msgSender(), key, envs[key], value);
        envs[key] = value;
    }

    function _setEnvs(
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
            _setEnv(keys[i], values[i]);
        }
    }

    function _removeEnv(string calldata key) internal {
        uint256 index = envKeyIndices[key];
        if (index == 0 && !key.equal(envKeys[0])) {
            revert EnvNotFound();
        }

        // Delete the key-value pair
        string memory lastKey = envKeys[envKeys.length - 1];
        envKeys[index] = lastKey;
        envKeyIndices[lastKey] = index;
        envKeys.pop();
        delete envKeyIndices[key];
        delete envs[key];

        emit EnvRemoved(_msgSender(), key);
    }
}
