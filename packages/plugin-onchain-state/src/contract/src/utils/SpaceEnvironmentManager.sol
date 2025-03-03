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
abstract contract SpaceEnvironmentManager is
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    using Strings for string;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant MAX_ENV_KEY_LENGTH = 32;
    uint256 public constant MAX_ENV_VALUE_LENGTH = 256;

    // Mapping from space to env mapping
    mapping(string => mapping(string => string)) public spaceEnvs;
    // Mapping from space to env keys array
    mapping(string => string[]) public spaceEnvKeys;
    // Mapping from space to key indices (1-based indexing to distinguish from default value 0)
    mapping(string => mapping(string => uint256)) private spaceEnvKeyIndices;

    error InvalidInput();
    error EnvNotFound();
    error UnauthorizedAccess();

    event EnvChanged(
        string indexed space,
        address indexed operator,
        string indexed key,
        string fromValue,
        string toValue
    );
    event EnvRemoved(
        string indexed space,
        address indexed operator,
        string indexed key
    );

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

    modifier onlySpaceOwnerOrOperator(string calldata space) {
        if (
            !(_isSpaceOwner(space, _msgSender()) ||
                _isSpaceOperator(space, _msgSender()))
        ) {
            revert UnauthorizedAccess();
        }
        _;
    }

    // This function must be implemented by the contract that inherits this one
    function _isSpaceOwner(
        string calldata space,
        address account
    ) internal virtual returns (bool);

    // This function must be implemented by the contract that inherits this one
    function _isSpaceOperator(
        string calldata space,
        address account
    ) internal virtual returns (bool);

    function getSpaceEnv(
        string calldata space,
        string calldata key
    ) external view returns (string memory) {
        return spaceEnvs[space][key];
    }

    function getAllSpaceEnvs(
        string calldata space
    ) external view returns (string[] memory keys, string[] memory values) {
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
    ) external onlySpaceOwnerOrOperator(space) {
        _setSpaceEnv(space, key, value);
    }

    function setSpaceEnvs(
        string calldata space,
        string[] calldata keys,
        string[] calldata values
    ) external onlySpaceOwnerOrOperator(space) whenNotPaused nonReentrant {
        _setSpaceEnvs(space, keys, values);
    }

    function removeSpaceEnv(
        string calldata space,
        string calldata key
    ) external onlySpaceOwnerOrOperator(space) {
        _removeSpaceEnv(space, key);
    }

    function _setSpaceEnv(
        string calldata space,
        string calldata key,
        string calldata value
    ) internal validEnvKey(key) validEnvValue(value) {
        // Check if the key already exists
        // Using 1-based indexing in spaceEnvKeyIndices, so 0 means the key doesn't exist
        if (spaceEnvKeyIndices[space][key] == 0) {
            // Key doesn't exist yet, add it to the keys array
            spaceEnvKeys[space].push(key);
            // Store the index + 1 to distinguish from the default value 0
            spaceEnvKeyIndices[space][key] = spaceEnvKeys[space].length;
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

    function _removeSpaceEnv(
        string calldata space,
        string calldata key
    ) internal {
        // Get the 1-based index and convert to 0-based
        uint256 keyIndex = spaceEnvKeyIndices[space][key];
        if (keyIndex == 0) {
            revert EnvNotFound();
        }
        
        uint256 index = keyIndex - 1; // Convert to 0-based index
        
        // Delete the key-value pair
        string memory lastKey = spaceEnvKeys[space][
            spaceEnvKeys[space].length - 1
        ];
        
        if (index != spaceEnvKeys[space].length - 1) {
            // If not the last element, move the last element to the position of the removed element
            spaceEnvKeys[space][index] = lastKey;
            // Update the index of the moved element (1-based)
            spaceEnvKeyIndices[space][lastKey] = index + 1;
        }
        
        spaceEnvKeys[space].pop();
        delete spaceEnvKeyIndices[space][key];
        delete spaceEnvs[space][key];

        emit EnvRemoved(space, _msgSender(), key);
    }
}
