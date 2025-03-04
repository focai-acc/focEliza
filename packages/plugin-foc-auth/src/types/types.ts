import { State } from "@elizaos/core";

export interface IdentityUser {
    id: string | null;
    nickname: string | null;
    description: string | null;
    avatarUrl: string | null;
    email: string | null;
    options: string | null;
}

export function getUserIdFromState(state: State): string | null {
    const userIdObj = state["tweet_username"];

    if (userIdObj && (userIdObj as string).trim() !== "") {
        return (userIdObj as string).trim();
    } else {
        // TODO try to grab the user from direct client
        // based on the signatues
        return null
    }

    return null;
}