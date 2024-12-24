// import Web3 from 'web3';

export class Registry {
    private contractAddress = "0x443744dd3cc33abc39d764b45b3ba256c4d2fa61";
    private RPC = "http://localhost:8545";

    constructor() {

    }

    /**
   * Get the hash for a given key from the contract.
   * @param key The key to query.
   * @returns The associated hash as a `bytes32`.
   */
    async getHash(key: string): Promise<string> {
        try {
            // const web3 = new Web3(new Web3.providers.HttpProvider(this.RPC));
            // const hash = await this.contract.methods.getHash(key).call();
            // return hash;
            return ""
        } catch (error) {
            console.error("Error fetching hash:", error);
            throw error;
        }
    }

  /**
   * Register or update a key-value pair in the contract.
   * @param key The key to register or update.
   * @param hash The hash value to associate with the key.
   * @param from The sender's address.
   */
  async registerOrUpdate(key: string, hash: string): Promise<void> {
    try {
        // const gas = await this.contract.methods.registerOrUpdate(key, hash).estimateGas({ from });
        // await this.contract.methods.registerOrUpdate(key, hash).send({ from, gas });
        // console.log("Successfully registered or updated key:", key);
    } catch (error) {
        console.error("Error registering or updating key:", error);
        throw error;
    }
  }
}