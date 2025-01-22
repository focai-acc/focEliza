import { StateDAO } from '../adapters/sqliteTables';
import { VerifiableState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

export class StateManager {
    private stateDAO: StateDAO;

    constructor(stateDAO: StateDAO) {
        this.stateDAO = stateDAO;
    }

    async registerAgent(agentId: string, name: string): Promise<boolean> {
        if (!agentId) {
            throw new Error('Agent ID is required');
        }

        // Generate key pair
        const keyPair = ec.genKeyPair();
        const publicKey = keyPair.getPublic('hex');
        const privateKey = keyPair.getPrivate('hex');

        return this.stateDAO.addAgent(agentId, name, publicKey, privateKey);
    }

    async setState(agentId: string, namespace: string, key: string, value: any): Promise<boolean> {
        // Get agent private key
        const privateKeyHex = await this.stateDAO.getAgentPrivateKey(agentId);
        if (!privateKeyHex) {
            throw new Error(`Agent ${agentId} not found or not registered`);
        }

        // Create private key from hex
        const privateKey = ec.keyFromPrivate(privateKeyHex, 'hex');

        // Create state object
        const state: VerifiableState = {
            id: uuidv4(),
            agentId,
            namespace,
            key,
            value,
            timestamp: Date.now(),
            signature: ''
        };

        // Sign state
        const message = this.createStateMessage(state);
        const signature = privateKey.sign(message).toDER('hex');
        state.signature = "0x" + signature;

        // Store state
        return this.stateDAO.addState(state);
    }

    async getState(agentId: string, namespace: string, key: string): Promise<VerifiableState | undefined> {
        const state = await this.stateDAO.getState(agentId, namespace, key);
        if (!state) {
            return undefined;
        }

        return {
            id: state.id,
            agentId: state.agentId,
            namespace: state.namespace,
            key: state.key,
            value: state.value,
            timestamp: state.timestamp,
            signature: state.signature
        };
    }

    async verifyState(state: VerifiableState): Promise<boolean> {
        // Get agent public key
        const publicKeyHex = await this.stateDAO.getAgentPublicKey(state.agentId);
        if (!publicKeyHex) {
            throw new Error(`Public key not found for agent ${state.agentId}`);
        }

        const publicKey = ec.keyFromPublic(publicKeyHex, 'hex');

        // Create message from state
        const message = this.createStateMessage(state);

        // Verify signature
        try {
            const signatureObj = {
                r: state.signature.slice(2, 66),
                s: state.signature.slice(66, 130)
            };
            return publicKey.verify(message, signatureObj);
        } catch (error) {
            return false;
        }
    }

    private createStateMessage(state: VerifiableState): string {
        // Create a deterministic message from state properties
        const message = JSON.stringify({
            id: state.id,
            agentId: state.agentId,
            namespace: state.namespace,
            key: state.key,
            value: state.value,
            timestamp: state.timestamp
        });

        return message;
    }
}
