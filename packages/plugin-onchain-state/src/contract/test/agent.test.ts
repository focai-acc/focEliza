import { expect } from "chai";
import { Contract, ethers, Log, Signer } from "ethers";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
    ElizaAgent__factory,
    ElizaAgentRegistry__factory,
    ElizaAgent,
    ElizaAgentRegistry,
    IElizaAgentRegistry,
} from "../typechain-types";

describe("Eliza Agent System", function () {
    const OPERATOR_ROLE = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes("OPERATOR_ROLE")
    );

    async function deployFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, operator, user] = await hre.ethers.getSigners();

        // Deploy ElizaAgent implementation
        const ElizaAgent: ElizaAgent__factory =
            await hre.ethers.getContractFactory("ElizaAgent");
        const elizaAgent = await ElizaAgent.deploy();

        // Deploy ElizaAgentRegistry
        const ElizaAgentRegistry: ElizaAgentRegistry__factory =
            await hre.ethers.getContractFactory("ElizaAgentRegistry");
        const elizaAgentRegistry = await ElizaAgentRegistry.deploy(
            await elizaAgent.getAddress()
        );

        return {
            owner,
            operator,
            user,
            elizaAgent,
            ElizaAgent,
            elizaAgentRegistry,
        };
    }

    describe("ElizaAgentRegistry", function () {
        describe("Deployment", function () {
            it("Should set the right owner", async function () {
                const { owner, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                expect(
                    await elizaAgentRegistry.hasRole(
                        ethers.ZeroHash,
                        owner.address
                    )
                ).to.equal(true);
            });

            it("Should set the correct agent template", async function () {
                const { elizaAgent, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                expect(await elizaAgentRegistry.agentTemplate()).to.equal(
                    await elizaAgent.getAddress()
                );
            });
        });

        describe("Access Control", function () {
            it("Should allow admin to update template", async function () {
                const { owner, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                const newTemplate = ethers.Wallet.createRandom().address;
                await elizaAgentRegistry.updateTemplate(newTemplate);
                expect(await elizaAgentRegistry.agentTemplate()).to.equal(
                    newTemplate
                );
            });

            it("Should not allow non-admin to update template", async function () {
                const { user, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                const newTemplate = ethers.Wallet.createRandom().address;
                await expect(
                    elizaAgentRegistry.connect(user).updateTemplate(newTemplate)
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "AccessControlUnauthorizedAccount"
                );
            });
        });

        describe("Space Operator Management", function () {
            it("Should allow space owner to grant operator permission", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Register space first
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });

                // Grant operator permission
                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .grantOperator("test-space", operator.address)
                ).to.not.be.reverted;

                // Verify operator status
                expect(
                    await elizaAgentRegistry.isOperator(
                        "test-space",
                        operator.address
                    )
                ).to.equal(true);
            });

            it("Should allow space owner to revoke operator permission", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Register space and grant operator
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });
                await elizaAgentRegistry
                    .connect(user)
                    .grantOperator("test-space", operator.address);

                // Revoke operator permission
                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .revokeOperator("test-space", operator.address)
                ).to.not.be.reverted;

                // Verify operator status is revoked
                expect(
                    await elizaAgentRegistry.isOperator(
                        "test-space",
                        operator.address
                    )
                ).to.equal(false);
            });

            it("Should not allow non-owner to grant operator permission", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Register space
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });

                // Try to grant operator permission as non-owner
                await expect(
                    elizaAgentRegistry
                        .connect(operator)
                        .grantOperator("test-space", operator.address)
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "UnauthorizedAccess"
                );
            });

            it("Should emit events when granting and revoking operators", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Register space
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });

                // Check grant event
                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .grantOperator("test-space", operator.address)
                )
                    .to.emit(elizaAgentRegistry, "OperatorGranted")
                    .withArgs("test-space", operator.address);

                // Check revoke event
                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .revokeOperator("test-space", operator.address)
                )
                    .to.emit(elizaAgentRegistry, "OperatorRevoked")
                    .withArgs("test-space", operator.address);
            });
        });

        describe("Agent Registration", function () {
            // Define a helper function to create AgentParams
            function createAgentParams(
                operator: string,
                space: string,
                name: string = "Test Agent",
                description: string = "Test Description",
                characterURI: string = "https://test.uri"
            ): IElizaAgentRegistry.AgentParamsStruct {
                return {
                    operator,
                    space,
                    name,
                    description,
                    characterURI,
                };
            }

            it("Should allow user to register agent in new space", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                const params = createAgentParams(
                    operator.address,
                    "test-space"
                );

                const agentId = await elizaAgentRegistry.getAgentId(
                    params.space,
                    0
                );
                await expect(
                    elizaAgentRegistry.connect(user).registerAgent(params)
                )
                    .to.emit(elizaAgentRegistry, "AgentRegistered")
                    .withArgs(
                        params.space,
                        agentId,
                        params.name,
                        await elizaAgentRegistry.predictAgentAddress(agentId),
                        0
                    );

                // Verify space owner
                expect(
                    await elizaAgentRegistry.getSpaceOwner(params.space)
                ).to.equal(user.address);
            });

            it("Should allow space owner to register multiple agents", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // First agent registration
                const params1 = createAgentParams(
                    operator.address,
                    "test-space",
                    "Agent 1",
                    "Test Description 1",
                    "https://test1.uri"
                );
                await elizaAgentRegistry.connect(user).registerAgent(params1);

                // Second agent registration in same space
                const params2 = createAgentParams(
                    operator.address, // Different operator for second agent
                    "test-space",
                    "Agent 2",
                    "Test Description 2",
                    "https://test2.uri"
                );
                await expect(
                    elizaAgentRegistry.connect(user).registerAgent(params2)
                ).to.not.be.reverted;

                // Verify both agents exist
                expect(await elizaAgentRegistry.agentIndex()).to.equal(2);
            });

            it("Should prevent non-owner from registering agent in existing space", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // First user claims the space
                const params1 = createAgentParams(
                    operator.address,
                    "test-space"
                );
                await elizaAgentRegistry.connect(user).registerAgent(params1);

                // Second user tries to use the same space
                const params2 = createAgentParams(
                    operator.address,
                    "test-space",
                    "Another Agent",
                    "Another Description",
                    "https://another.uri"
                );
                await expect(
                    elizaAgentRegistry.connect(operator).registerAgent(params2)
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "UnauthorizedAccess"
                );
            });

            it("Should allow different users to create agents in different spaces", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // First user creates agent in their space
                const userParams = createAgentParams(
                    operator.address,
                    "user-space",
                    "User Agent",
                    "User Description",
                    "https://user.uri"
                );
                await elizaAgentRegistry
                    .connect(user)
                    .registerAgent(userParams);

                // Second user creates agent in different space
                const operatorParams = createAgentParams(
                    user.address, // Different operator for second space
                    "operator-space",
                    "Operator Agent",
                    "Operator Description",
                    "https://operator.uri"
                );
                await expect(
                    elizaAgentRegistry
                        .connect(operator)
                        .registerAgent(operatorParams)
                ).to.not.be.reverted;

                // Verify both spaces have correct owners
                expect(
                    await elizaAgentRegistry.getSpaceOwner(userParams.space)
                ).to.equal(user.address);
                expect(
                    await elizaAgentRegistry.getSpaceOwner(operatorParams.space)
                ).to.equal(operator.address);
            });

            it("Should properly initialize agent with correct creator and operator", async function () {
                const { user, operator, elizaAgentRegistry, ElizaAgent } =
                    await loadFixture(deployFixture);

                const params = createAgentParams(
                    operator.address,
                    "test-space"
                );

                const tx = await elizaAgentRegistry
                    .connect(user)
                    .registerAgent(params);
                await tx.wait(1);

                let index = await elizaAgentRegistry.agentIndex();
                const agentAddress =
                    await elizaAgentRegistry.getCreatorLatestAgent(
                        await user.getAddress(),
                        0,
                        Number(index) - 1
                    );
                const agent = ElizaAgent.attach(agentAddress) as ElizaAgent;

                // // Verify creator and operator
                expect(await agent.getCreator()).to.equal(user.address); // Creator is msg.sender
                expect(await agent.isOperator(params.operator)).to.equal(true); // Operator from params
            });

            it("Should fail when registering with invalid space name", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                const params = createAgentParams(
                    operator.address,
                    "" // Empty space name
                );

                await expect(
                    elizaAgentRegistry.connect(user).registerAgent(params)
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "InvalidSpaceName"
                );
            });

            it("Should set correct creator regardless of operator", async function () {
                const { user, operator, elizaAgentRegistry, ElizaAgent } =
                    await loadFixture(deployFixture);

                const params = createAgentParams(
                    user.address, // Setting operator as the same as the caller
                    "test-space"
                );

                const tx = await elizaAgentRegistry
                    .connect(user)
                    .registerAgent(params);
                await tx.wait(1);

                let index = await elizaAgentRegistry.agentIndex();
                const agentAddress =
                    await elizaAgentRegistry.getCreatorLatestAgent(
                        await user.getAddress(),
                        0,
                        Number(index) - 1
                    );
                const agent = ElizaAgent.attach(agentAddress) as ElizaAgent;

                // Creator should still be msg.sender even when operator is the same address
                expect(await agent.getCreator()).to.equal(user.address);
                expect(await agent.isOperator(params.operator)).to.equal(true); // Operator from params
            });
        });

        describe("Space Ownership Transfer", function () {
            it("Should only allow space owner to transfer ownership", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Register space
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });

                // Transfer ownership
                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .transferSpaceOwnership("test-space", operator.address)
                )
                    .to.emit(elizaAgentRegistry, "SpaceOwnershipTransferred")
                    .withArgs("test-space", user.address, operator.address);

                // Verify new owner
                expect(
                    await elizaAgentRegistry.getSpaceOwner("test-space")
                ).to.equal(operator.address);
            });

            it("Should not allow operator to transfer space ownership", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Register space and grant operator
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });
                await elizaAgentRegistry
                    .connect(user)
                    .grantOperator("test-space", operator.address);

                // Attempt transfer ownership as operator
                await expect(
                    elizaAgentRegistry
                        .connect(operator)
                        .transferSpaceOwnership("test-space", operator.address)
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "UnauthorizedAccess"
                );
            });
        });

        describe("Space Ownership", function () {
            it("Should allow first user to claim a space", async function () {
                const { user, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                await expect(
                    elizaAgentRegistry.registerAgent({
                        operator: user.address,
                        space: "test-space",
                        name: "Test Agent",
                        description: "Test Description",
                        characterURI: "https://test.uri",
                    })
                ).to.not.be.reverted;
            });

            it("Should allow space owner to create multiple agents in same space", async function () {
                const { user, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // First agent registration

                await elizaAgentRegistry.registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Agent 1",
                    description: "Test Description 1",
                    characterURI: "https://test1.uri",
                });

                // Second agent registration in same space should succeed
                await expect(
                    elizaAgentRegistry.registerAgent({
                        operator: user.address,
                        space: "test-space",
                        name: "Agent 2",
                        description: "Test Description 2",
                        characterURI: "https://test2.uri",
                    })
                ).to.not.be.reverted;
            });

            it("Should prevent non-owner from creating agent in existing space", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // First user claims the space
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "test-space",
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });

                // Second user tries to use the same space
                await expect(
                    elizaAgentRegistry.connect(operator).registerAgent({
                        operator: operator.address,
                        space: "test-space",
                        name: "Another Agent",
                        description: "Another Description",
                        characterURI: "https://another.uri",
                    })
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "UnauthorizedAccess"
                );
            });

            it("Should allow different users to create agents in different spaces", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // First user creates agent in their space
                await expect(
                    elizaAgentRegistry.registerAgent({
                        operator: user.address,
                        space: "user-space",
                        name: "User Agent",
                        description: "User Description",
                        characterURI: "https://user.uri",
                    })
                ).to.not.be.reverted;

                // Second user creates agent in different space
                await expect(
                    elizaAgentRegistry.registerAgent({
                        operator: operator.address,
                        space: "operator-space",
                        name: "Operator Agent",
                        description: "Operator Description",
                        characterURI: "https://operator.uri",
                    })
                ).to.not.be.reverted;
            });
        });

        describe("Space Management", function () {
            it("Should get all spaces for a creator correctly", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Initially no spaces
                expect(
                    await elizaAgentRegistry.getCreatorAllSpaces(
                        user.address,
                        0,
                        0
                    )
                ).to.deep.equal([]);

                // Register first agent in space1
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "space1",
                    name: "Agent1",
                    description: "Description1",
                    characterURI: "ipfs://1",
                });

                // Check user has one space
                expect(
                    await elizaAgentRegistry.getCreatorAllSpaces(
                        user.address,
                        0,
                        1
                    )
                ).to.deep.equal(["space1"]);

                // Register second agent in space2
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "space2",
                    name: "Agent2",
                    description: "Description2",
                    characterURI: "ipfs://2",
                });

                // Check user has two spaces
                expect(
                    await elizaAgentRegistry.getCreatorAllSpaces(
                        user.address,
                        0,
                        1
                    )
                ).to.deep.equal(["space1", "space2"]);

                // Register another agent in existing space2 (shouldn't add new space)
                await elizaAgentRegistry.connect(user).registerAgent({
                    operator: user.address,
                    space: "space2",
                    name: "Agent3",
                    description: "Description3",
                    characterURI: "ipfs://3",
                });

                // Should still have same two spaces
                expect(
                    await elizaAgentRegistry.getCreatorAllSpaces(
                        user.address,
                        0,
                        1
                    )
                ).to.deep.equal(["space1", "space2"]);

                // Register agent in space3 with operator
                await elizaAgentRegistry.connect(operator).registerAgent({
                    operator: operator.address,
                    space: "space3",
                    name: "Agent4",
                    description: "Description4",
                    characterURI: "ipfs://4",
                });

                // Check spaces for both users
                expect(
                    await elizaAgentRegistry.getCreatorAllSpaces(
                        user.address,
                        0,
                        Number(await elizaAgentRegistry.spaceIndex()) - 1
                    )
                ).to.deep.equal(["space1", "space2"]);
                expect(
                    await elizaAgentRegistry.getCreatorAllSpaces(
                        operator.address,
                        0,
                        Number(await elizaAgentRegistry.spaceIndex()) - 1
                    )
                ).to.deep.equal(["space3"]);

                // Test invalid ranges
                await expect(
                    elizaAgentRegistry.getCreatorAllSpaces(user.address, 1, 0)
                ).to.be.revertedWith("Invalid range");

                await expect(
                    elizaAgentRegistry.getCreatorAllSpaces(
                        user.address,
                        0,
                        Number(await elizaAgentRegistry.spaceIndex()) + 1
                    )
                ).to.be.revertedWith("End index out of bounds");
            });

            it("Should get all agents for a space correctly", async function () {
                const { user, operator, elizaAgentRegistry } =
                    await loadFixture(deployFixture);

                // Initially no agents
                expect(
                    await elizaAgentRegistry.getAgentsBySpace("space1", 0, 0)
                ).to.deep.equal([]);

                // Register first agent in space1
                const tx1 = await elizaAgentRegistry
                    .connect(user)
                    .registerAgent({
                        operator: user.address,
                        space: "space1",
                        name: "Agent1",
                        description: "Description1",
                        characterURI: "ipfs://1",
                    });
                await tx1.wait(1);

                let index = await elizaAgentRegistry.agentIndex();
                const agent1 = await elizaAgentRegistry.getCreatorLatestAgent(
                    await user.getAddress(),
                    0,
                    Number(index) - 1
                );

                // Check space1 has one agent
                const space1Agents1 = await elizaAgentRegistry.getAgentsBySpace(
                    "space1",
                    0,
                    Number(await elizaAgentRegistry.agentIndex())
                );
                expect(space1Agents1).to.deep.equal([agent1]);

                // Register second agent in space1
                const tx2 = await elizaAgentRegistry
                    .connect(user)
                    .registerAgent({
                        operator: user.address,
                        space: "space1",
                        name: "Agent2",
                        description: "Description2",
                        characterURI: "ipfs://2",
                    });
                await tx2.wait(1);
                index = await elizaAgentRegistry.agentIndex();
                const agent2 = await elizaAgentRegistry.getCreatorLatestAgent(
                    await user.getAddress(),
                    0,
                    Number(index) - 1
                );

                // Check space1 has two agents
                const space1Agents2 = await elizaAgentRegistry.getAgentsBySpace(
                    "space1",
                    0,
                    Number(index)
                );
                expect(space1Agents2).to.deep.equal([agent1, agent2]);

                // Register agent in space2
                const tx3 = await elizaAgentRegistry
                    .connect(operator)
                    .registerAgent({
                        operator: operator.address,
                        space: "space2",
                        name: "Agent3",
                        description: "Description3",
                        characterURI: "ipfs://3",
                    });
                await tx3.wait(1);
                index = await elizaAgentRegistry.agentIndex();
                const agent3 = await elizaAgentRegistry.getCreatorLatestAgent(
                    await operator.getAddress(),
                    0,
                    Number(index) - 1
                );

                // Check both spaces
                const space1Agents3 = await elizaAgentRegistry.getAgentsBySpace(
                    "space1",
                    0,
                    Number(index)
                );
                expect(space1Agents3).to.deep.equal([agent1, agent2]);

                const space2Agents = await elizaAgentRegistry.getAgentsBySpace(
                    "space2",
                    0,
                    Number(index)
                );
                expect(space2Agents).to.deep.equal([agent3]);

                // Test invalid ranges
                await expect(
                    elizaAgentRegistry.getAgentsBySpace("space1", 1, 0)
                ).to.be.revertedWith("Invalid range");

                await expect(
                    elizaAgentRegistry.getAgentsBySpace(
                        "space1",
                        0,
                        Number(await elizaAgentRegistry.agentIndex()) + 1
                    )
                ).to.be.revertedWith("End index out of bounds");

                // Test non-existent space
                const nonExistentSpaceAgents =
                    await elizaAgentRegistry.getAgentsBySpace(
                        "non-existent-space",
                        0,
                        Number(await elizaAgentRegistry.agentIndex())
                    );
                expect(nonExistentSpaceAgents).to.deep.equal([]);
            });
        });

        describe("Space Environment Variables", function () {
            const TEST_SPACE = "test-space";

            async function setupSpaceOwner() {
                const { owner, user, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                await elizaAgentRegistry.grantRole(
                    OPERATOR_ROLE,
                    owner.address
                );

                // Register an agent to become space owner
                await elizaAgentRegistry.registerAgent({
                    operator: owner.address,
                    space: TEST_SPACE,
                    name: "Test Agent",
                    description: "Test Description",
                    characterURI: "https://test.uri",
                });

                return { owner, user, elizaAgentRegistry };
            }

            it("Should set and get space environment variable", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                await elizaAgentRegistry.setSpaceEnv(
                    TEST_SPACE,
                    "TEST_KEY",
                    "TEST_VALUE"
                );
                expect(
                    await elizaAgentRegistry.getSpaceEnv(TEST_SPACE, "TEST_KEY")
                ).to.equal("TEST_VALUE");
            });

            it("Should set multiple space environment variables in batch", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                const keys = ["KEY1", "KEY2"];
                const values = ["VALUE1", "VALUE2"];
                await elizaAgentRegistry.setSpaceEnvs(TEST_SPACE, keys, values);

                const [resultKeys, resultValues] =
                    await elizaAgentRegistry.getAllSpaceEnvs(TEST_SPACE);
                expect(Array.from(resultKeys)).to.have.members(keys);
                expect(Array.from(resultValues)).to.have.members(values);
            });

            it("Should remove space environment variable", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                await elizaAgentRegistry.setSpaceEnv(
                    TEST_SPACE,
                    "TEST_KEY",
                    "TEST_VALUE"
                );
                await elizaAgentRegistry.removeSpaceEnv(TEST_SPACE, "TEST_KEY");
                expect(
                    await elizaAgentRegistry.getSpaceEnv(TEST_SPACE, "TEST_KEY")
                ).to.equal("");
            });

            it("Should prevent non-space-owner from setting env", async function () {
                const { user, elizaAgentRegistry } =
                    await loadFixture(deployFixture);
                await elizaAgentRegistry.grantRole(OPERATOR_ROLE, user.address);

                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .setSpaceEnv(TEST_SPACE, "TEST_KEY", "TEST_VALUE")
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "UnauthorizedAccess"
                );
            });

            it("Should prevent non-operator from setting space envs", async function () {
                const { owner, user, elizaAgentRegistry } =
                    await setupSpaceOwner();

                // User is not an operator
                await expect(
                    elizaAgentRegistry
                        .connect(user)
                        .setSpaceEnv(TEST_SPACE, "TEST_KEY", "TEST_VALUE")
                ).to.be.reverted;
            });

            it("Should allow different spaces to have same env keys with different values", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                // Create another space
                await elizaAgentRegistry.registerAgent({
                    operator: owner.address,
                    space: "another-space",
                    name: "Another Agent",
                    description: "Another Description",
                    characterURI: "https://another.uri",
                });

                // Set same key with different values in different spaces
                await elizaAgentRegistry.setSpaceEnv(
                    TEST_SPACE,
                    "COMMON_KEY",
                    "VALUE1"
                );
                await elizaAgentRegistry.setSpaceEnv(
                    "another-space",
                    "COMMON_KEY",
                    "VALUE2"
                );

                expect(
                    await elizaAgentRegistry.getSpaceEnv(
                        TEST_SPACE,
                        "COMMON_KEY"
                    )
                ).to.equal("VALUE1");
                expect(
                    await elizaAgentRegistry.getSpaceEnv(
                        "another-space",
                        "COMMON_KEY"
                    )
                ).to.equal("VALUE2");
            });

            it("Should fail when setting env with invalid key length", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                const longKey = "x".repeat(33); // MAX_ENV_KEY_LENGTH + 1
                await expect(
                    elizaAgentRegistry.setSpaceEnv(
                        TEST_SPACE,
                        longKey,
                        "TEST_VALUE"
                    )
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "InvalidInput"
                );
            });

            it("Should fail when setting env with invalid value length", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                const longValue = "x".repeat(257); // MAX_ENV_VALUE_LENGTH + 1
                await expect(
                    elizaAgentRegistry.setSpaceEnv(
                        TEST_SPACE,
                        "TEST_KEY",
                        longValue
                    )
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "InvalidInput"
                );
            });

            it("Should fail when setting envs with batch size exceeding limit", async function () {
                const { owner, elizaAgentRegistry } = await setupSpaceOwner();

                const keys = Array(101)
                    .fill(0)
                    .map((_, i) => `KEY${i}`); // MAX_BATCH_SIZE + 1
                const values = Array(101)
                    .fill(0)
                    .map((_, i) => `VALUE${i}`);
                await expect(
                    elizaAgentRegistry.setSpaceEnvs(TEST_SPACE, keys, values)
                ).to.be.revertedWithCustomError(
                    elizaAgentRegistry,
                    "InvalidInput"
                );
            });

            it("Should maintain space envs after transferring space ownership", async function () {
                const { owner, user, elizaAgentRegistry } =
                    await setupSpaceOwner();

                // Set env as original owner
                await elizaAgentRegistry.setSpaceEnv(
                    TEST_SPACE,
                    "TEST_KEY",
                    "TEST_VALUE"
                );

                // Transfer ownership
                await elizaAgentRegistry.transferSpaceOwnership(
                    TEST_SPACE,
                    user.address
                );

                // Original value should still be there
                expect(
                    await elizaAgentRegistry.getSpaceEnv(TEST_SPACE, "TEST_KEY")
                ).to.equal("TEST_VALUE");

                // Grant operator role to new owner
                await elizaAgentRegistry.grantRole(OPERATOR_ROLE, user.address);

                // New owner should be able to set env
                await elizaAgentRegistry
                    .connect(user)
                    .setSpaceEnv(TEST_SPACE, "NEW_KEY", "NEW_VALUE");
                expect(
                    await elizaAgentRegistry.getSpaceEnv(TEST_SPACE, "NEW_KEY")
                ).to.equal("NEW_VALUE");
            });
        });
    });

    describe("ElizaAgent", function () {
        async function deployAgent() {
            const { user, operator, elizaAgentRegistry } =
                await loadFixture(deployFixture);

            // Register a new agent to test with
            const tx = await elizaAgentRegistry.connect(user).registerAgent({
                operator: user.address,
                space: "testSpace",
                name: "TestAgent",
                description: "Test Description",
                characterURI: "ipfs://test",
            });
            await tx.wait(1);
            const index = await elizaAgentRegistry.agentIndex();
            const deployedAgentAddress =
                await elizaAgentRegistry.getCreatorLatestAgent(
                    await user.getAddress(),
                    0,
                    Number(index) - 1
                );

            const deployedAgent = await hre.ethers.getContractAt(
                "ElizaAgent",
                deployedAgentAddress
            );

            await deployedAgent
                .connect(user)
                .grantRole(OPERATOR_ROLE, operator.address);

            return { deployedAgent };
        }

        describe("Environment Variables", function () {
            it("Should set single environment variable", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                await deployedAgent
                    .connect(operator)
                    .setEnv("TEST_KEY", "TEST_VALUE");
                expect(await deployedAgent.getEnv("TEST_KEY")).to.equal(
                    "TEST_VALUE"
                );
            });

            it("Should set multiple environment variables in batch", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const keys = ["KEY1", "KEY2"];
                const values = ["VALUE1", "VALUE2"];
                await deployedAgent.connect(operator).setEnvs(keys, values);

                const [resultKeys, resultValues] =
                    await deployedAgent.getAllEnvs();
                expect(Array.from(resultKeys)).to.have.members(keys);
                expect(Array.from(resultValues)).to.have.members(values);
            });

            it("Should remove environment variable", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                await deployedAgent
                    .connect(operator)
                    .setEnv("TEST_KEY", "TEST_VALUE");
                await deployedAgent.connect(operator).removeEnv("TEST_KEY");
                expect(await deployedAgent.getEnv("TEST_KEY")).to.equal("");
            });

            it("Should fail to set env with invalid key length", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const longKey = "x".repeat(33);
                await expect(
                    deployedAgent
                        .connect(operator)
                        .setEnv(longKey, "TEST_VALUE")
                ).to.be.revertedWithCustomError(deployedAgent, "InvalidInput");
            });
        });

        describe("State Data", function () {
            it("Should store and retrieve state data with version", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key = "test-key";
                const data1 = hre.ethers.toUtf8Bytes("data-v1");
                const data2 = hre.ethers.toUtf8Bytes("data-v2");

                // Store version 1
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key, data1, 1n);

                const storedData1 = await deployedAgent.getStateData(key, 1n);
                expect(hre.ethers.getBytes(storedData1)).to.deep.equal(data1);

                // Store version 2
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key, data2, 2n);

                const storedData2 = await deployedAgent.getStateData(key, 2n);
                expect(hre.ethers.getBytes(storedData2)).to.deep.equal(data2);

                // Version 1 should still be accessible
                const storedData1Again = await deployedAgent.getStateData(
                    key,
                    1n
                );
                expect(hre.ethers.getBytes(storedData1Again)).to.deep.equal(
                    data1
                );

                // Latest version should be 2
                const [latestData, latestVersion] =
                    await deployedAgent.getLatestStateData(key);
                expect(hre.ethers.getBytes(latestData)).to.deep.equal(data2);
                expect(latestVersion).to.equal(2n);
            });

            it("Should prevent storing data with older version", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key = "test-key";
                const data1 = hre.ethers.toUtf8Bytes("data-v1");
                const data2 = hre.ethers.toUtf8Bytes("data-v2");

                // Store version 2
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key, data1, 2n);

                // Attempt to store version 1 should fail
                await expect(
                    deployedAgent
                        .connect(operator)
                        .storeStateData(key, data2, 1n)
                ).to.be.revertedWithCustomError(
                    deployedAgent,
                    "InvalidVersion"
                );
            });

            it("Should allow updating same version", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key = "test-key";
                const data1 = hre.ethers.toUtf8Bytes("data-v1");
                const data2 = hre.ethers.toUtf8Bytes("data-v1-updated");

                // Store initial version 1
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key, data1, 1n);

                // Update version 1
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key, data2, 1n);

                // Check updated data
                const storedData = await deployedAgent.getStateData(key, 1n);
                expect(hre.ethers.getBytes(storedData)).to.deep.equal(data2);
            });

            it("Should emit StateDataChanged event with version", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key = "test-key";
                const data = hre.ethers.toUtf8Bytes("test-data");
                const version = 1n;

                await expect(
                    deployedAgent
                        .connect(operator)
                        .storeStateData(key, data, version)
                )
                    .to.emit(deployedAgent, "StateDataChanged")
                    .withArgs(
                        operator.address,
                        key,
                        "0x", // Initial value is empty
                        data,
                        version
                    );
            });

            it("Should prevent non-operator from storing state data", async function () {
                const { owner } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key = "test-key";
                const data = hre.ethers.toUtf8Bytes("test-data");

                await expect(
                    deployedAgent.connect(owner).storeStateData(key, data, 1n)
                ).to.be.reverted;
            });

            it("Should prevent storing excessive data size", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key = "test-key";
                const largeData = hre.ethers.toUtf8Bytes(
                    "x".repeat(256 * 1024 + 1)
                ); // Exceeds 256kb

                await expect(
                    deployedAgent
                        .connect(operator)
                        .storeStateData(key, largeData, 1n)
                ).to.be.revertedWithCustomError(
                    deployedAgent,
                    "ExcessiveDataSize"
                );
            });

            it("Should handle multiple keys with different versions", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const key1 = "key1";
                const key2 = "key2";
                const data1 = hre.ethers.toUtf8Bytes("data1");
                const data2 = hre.ethers.toUtf8Bytes("data2");

                // Store different versions for different keys
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key1, data1, 1n);
                await deployedAgent
                    .connect(operator)
                    .storeStateData(key2, data2, 2n);

                // Check data and versions
                const storedData1 = await deployedAgent.getStateData(key1, 1n);
                const storedData2 = await deployedAgent.getStateData(key2, 2n);

                expect(hre.ethers.getBytes(storedData1)).to.deep.equal(data1);
                expect(hre.ethers.getBytes(storedData2)).to.deep.equal(data2);

                const [latestData1, latestVersion1] =
                    await deployedAgent.getLatestStateData(key1);
                const [latestData2, latestVersion2] =
                    await deployedAgent.getLatestStateData(key2);

                expect(latestVersion1).to.equal(1n);
                expect(latestVersion2).to.equal(2n);
                expect(hre.ethers.getBytes(latestData1)).to.deep.equal(data1);
                expect(hre.ethers.getBytes(latestData2)).to.deep.equal(data2);
            });
        });

        describe("DB Data Recording", function () {
            it("Should record DB data", async function () {
                const { operator } = await loadFixture(deployFixture);
                const { deployedAgent } = await loadFixture(deployAgent);

                const tx = await deployedAgent
                    .connect(operator)
                    .recordDBData(
                        "v1",
                        "users",
                        ["1", "2"],
                        [
                            hre.ethers.toUtf8Bytes("data1"),
                            hre.ethers.toUtf8Bytes("data2"),
                        ]
                    );
                const receipt = await tx.wait();
                const events = receipt?.logs?.filter(
                    (e) => (e as ethers.EventLog).eventName === "DBDataRecorded"
                );
                expect(events?.length).to.equal(2);
            });
        });

        describe("Access Control", async function () {
            const { operator } = await loadFixture(deployFixture);
            const { user } = await loadFixture(deployFixture);

            it("Should prevent unauthorized env management", async function () {
                const { deployedAgent } = await loadFixture(deployAgent);
                await expect(
                    deployedAgent.connect(user).setEnv("TEST_KEY", "TEST_VALUE")
                ).to.be.reverted;
            });

            it("Should prevent unauthorized state data management", async function () {
                const { deployedAgent } = await loadFixture(deployAgent);
                await expect(
                    deployedAgent
                        .connect(user)
                        .storeStateData(
                            "key",
                            hre.ethers.toUtf8Bytes("value"),
                            1n
                        )
                ).to.be.reverted;
            });
        });
    });
});
