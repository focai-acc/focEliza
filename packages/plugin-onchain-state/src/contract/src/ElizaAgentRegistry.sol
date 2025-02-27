// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./agent/ElizaAgent.sol";
import "./interfaces/IElizaAgentRegistry.sol";
import "./utils/SpaceEnvironmentManager.sol";
import "hardhat/console.sol";

contract ElizaAgentRegistry is IElizaAgentRegistry, SpaceEnvironmentManager {
    address public agentTemplate;
    mapping(string => address) private spaceOwners;

    mapping(uint256 => string) public spacesIndexer;
    uint256 public spaceIndex;

    mapping(bytes32 => address) public agents;
    uint256 public agentIndex;
    mapping(uint256 => address) public agentsIndexer;

    constructor(
        address _agentTemplate
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(OPERATOR_ROLE, _msgSender());

        agentTemplate = _agentTemplate;
    }

    modifier validSpaceName(string calldata _space) {
        if (bytes(_space).length == 0) {
            revert InvalidSpaceName();
        }
        _;
    }

    function updateTemplate(address _agentTemplate) external onlyRole(OPERATOR_ROLE) {
        if (_agentTemplate != agentTemplate) {
            emit AgentTemplateChanged(_msgSender(), agentTemplate, _agentTemplate);
            agentTemplate = _agentTemplate;
        }
    }

    function registerAgent(
        address _creator,
        string calldata _space,
        string calldata _name,
        string calldata _description,
        string calldata _characterURI
    ) external whenNotPaused nonReentrant validSpaceName(_space) returns (address) {
        address creator = _creator;
        string calldata space = _space;
        string calldata name = _name;
        string calldata description = _description;
        string calldata characterURI = _characterURI;

        // Check if space exists and verify ownership
        address existingOwner = spaceOwners[space];
        if (existingOwner != address(0) && existingOwner != creator) {
            revert UnauthorizedAccess();
        }

        bytes32 id = keccak256(abi.encodePacked(space, agentIndex));
        AgentInfo memory info = AgentInfo({
            space: space,
            agentId: id,
            name: name,
            description: description,
            characterURI: characterURI
        });

        address agent = Clones.cloneDeterministic(agentTemplate, id);
        IElizaAgent(agent).initialize(creator, info);

        if (existingOwner == address(0)) {
            spaceOwners[space] = creator;
            spacesIndexer[spaceIndex] = space;
            spaceIndex++;
        }

        emit AgentRegistered(space, id, name, agent, agentIndex);

        agents[id] = agent;
        agentsIndexer[agentIndex] = agent;
        agentIndex++;

        return agent;
    }

    function getCreatorLatestAgent(
        address creator,
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (address) {
        for (uint256 i = endIndex; i >= startIndex;) {
            address _creator = IElizaAgent(agentsIndexer[i]).getCreator();
            if (creator == _creator) {
                return agentsIndexer[i];
            }
            if (i > startIndex) {
                i--;
            } else {
                break;
            }
        }
        return address(0);
    }

    function getCreatorAllSpaces(
        address creator,
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (string[] memory) {
        require(endIndex >= startIndex, "Invalid range");
        require(endIndex <= spaceIndex, "End index out of bounds");

        // First pass: count spaces owned by creator
        uint256 count = 0;
        for (uint256 i = startIndex; i <= endIndex;) {
            string memory space = spacesIndexer[i];
            if (bytes(space).length > 0 && spaceOwners[space] == creator) {
                count++;
            }
            unchecked { i++; }
        }

        // Second pass: collect spaces
        string[] memory creatorSpaces = new string[](count);
        uint256 arrayIndex = 0;
        for (uint256 i = startIndex; i <= endIndex;) {
            string memory space = spacesIndexer[i];
            if (bytes(space).length > 0 && spaceOwners[space] == creator) {
                creatorSpaces[arrayIndex] = space;
                arrayIndex++;
            }
            unchecked { i++; }
        }

        return creatorSpaces;
    }

    function getAgentsBySpace(
        string calldata space,
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (address[] memory) {
        require(endIndex >= startIndex, "Invalid range");
        require(endIndex <= agentIndex, "End index out of bounds");

        // First pass: count agents in space
        uint256 count = 0;
        for (uint256 i = startIndex; i < endIndex;) {
            address agent = agentsIndexer[i];
            if (agent != address(0)) {
                AgentInfo memory info = IElizaAgent(agent).getInfo();
                if (keccak256(bytes(info.space)) == keccak256(bytes(space))) {
                    count++;
                }
            }
            unchecked { i++; }
        }

        // Second pass: collect agents
        address[] memory spaceAgents = new address[](count);
        uint256 arrayIndex = 0;
        for (uint256 i = startIndex; i < endIndex;) {
            address agent = agentsIndexer[i];
            if (agent != address(0)) {
                AgentInfo memory info = IElizaAgent(agent).getInfo();
                if (keccak256(bytes(info.space)) == keccak256(bytes(space))) {
                    spaceAgents[arrayIndex] = agent;
                    arrayIndex++;
                }
            }
            unchecked { i++; }
        }

        return spaceAgents;
    }

    function transferSpaceOwnership(
        string calldata _space,
        address _newOwner
    ) external validSpaceName(_space) {
        if (_msgSender() != spaceOwners[_space]) {
            revert UnauthorizedAccess();
        }
        spaceOwners[_space] = _newOwner;
    }

    function _isSpaceOwner(string calldata space, address account) internal view override returns (bool) {
        return spaceOwners[space] == account;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit RegistryPaused(_msgSender());
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit RegistryUnpaused(_msgSender());
    }

    function getAgent(bytes32 agentId) external view returns (address) {
        return agents[agentId];
    }

    function getSpaceOwner(string calldata _space) external view returns (address) {
        return spaceOwners[_space];
    }
}
