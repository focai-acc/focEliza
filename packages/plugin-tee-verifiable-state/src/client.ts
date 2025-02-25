import { StateMetadata, StateVerification } from "./types";

export class VerifiableStateClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getStates(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/verifiable/states`);
        const data = await response.json();
        return data.states;
    }

    async generateProof(
        stateName: string,
        key: string
    ): Promise<StateMetadata> {
        const response = await fetch(
            `${this.baseUrl}/verifiable/states/proof`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ stateName, key }),
            }
        );
        return response.json();
    }

    async verifyState(
        stateName: string,
        key: string,
        expectedValue: any
    ): Promise<StateVerification> {
        const response = await fetch(
            `${this.baseUrl}/verifiable/states/verify`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ stateName, key, expectedValue }),
            }
        );
        return response.json();
    }

    async getTeeConfig(): Promise<any> {
        const response = await fetch(
            `${this.baseUrl}/verifiable/states/config`
        );
        return response.json();
    }
}
