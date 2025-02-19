// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IElizaAgentRegistry {
    /// @notice Custom errors
    error InvalidSpaceName();
    error InvalidRange();
    error ExcessiveArrayLength();

    /// @notice Events
    event AgentTemplateChanged(address indexed operator, address indexed from, address indexed to);
    event AgentRegistered(string indexed space, bytes32 indexed agentId, string name, address agentAddress, uint256 index);
    event RegistryPaused(address indexed operator);
    event RegistryUnpaused(address indexed operator);
    event SpaceOwnershipTransferred(string indexed space, address indexed from, address indexed to);

    function updateTemplate(address _agentTemplate) external;

    function registerAgent(
        string calldata _space,
        string calldata _name,
        string calldata _description,
        string calldata _characterURI
    ) external returns (address);

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
