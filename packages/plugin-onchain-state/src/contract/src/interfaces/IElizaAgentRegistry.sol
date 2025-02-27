// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IElizaAgentRegistry {
    /// @notice Custom errors
    error InvalidSpaceName();
    error InvalidRange();
    error ExcessiveArrayLength();
    error InvalidAddress();

    /// @notice Structs
    struct AgentParams {
        address operator;
        string space;
        string name;
        string description;
        string characterURI;
    }

    /// @notice Events
    event AgentTemplateChanged(address indexed operator, address indexed from, address indexed to);
    event AgentRegistered(string indexed space, bytes32 indexed agentId, string name, address agentAddress, uint256 index);
    event RegistryPaused(address indexed operator);
    event RegistryUnpaused(address indexed operator);
    event SpaceOwnershipTransferred(string indexed space, address indexed from, address indexed to);

    // Events for operator management
    event OperatorGranted(string indexed space, address indexed operator);
    event OperatorRevoked(string indexed space, address indexed operator);

    function updateTemplate(address _agentTemplate) external;

    function registerAgent(
        AgentParams calldata params
    ) external returns (address);

    function predictAgentAddress(bytes32 id) external view returns(address);

    function getAgentId(string calldata space, uint256 index) external pure returns(bytes32);

    function getCreatorLatestAgent(
        address creator,
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (address);

    function transferSpaceOwnership(
        string calldata _space,
        address _newOwner
    ) external;

    function pause() external;

    function unpause() external;

    function getAgent(bytes32 agentId) external view returns (address);

    function getSpaceOwner(string calldata _space) external view returns (address);
}
