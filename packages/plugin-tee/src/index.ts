import { Plugin } from "@ai16z/eliza";
import {
    RemoteAttestationProvider,
    remoteAttestationProvider,
} from "./providers/remoteAttestationProvider";
import {
    DeriveKeyProvider,
    deriveKeyProvider,
} from "./providers/deriveKeyProvider";

export { RemoteAttestationProvider, DeriveKeyProvider };

export const teePlugin: Plugin = {
    name: "tee",
    description:
        "TEE plugin with actions to generate remote attestations and derive keys",
    actions: [
        /* custom actions */
    ],
    evaluators: [
        /* custom evaluators */
    ],
    providers: [
        /* custom providers */
        remoteAttestationProvider,
        deriveKeyProvider,
    ],
    services: [
        /* custom services */
    ],
};
