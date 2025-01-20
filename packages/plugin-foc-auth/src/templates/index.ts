export const getIdentityAuthTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
\`\`\`json
{
    "nickName": "",
    "walletAddress": "",
    "twitterHandle": ""
}
\`\`\`

Recent messages:
{{recentMessages}}

Given the recent messages above, extract the following information about the requested:
- User's nick name, who want to auth his id
- Crypto wallet address in user's input, it may be eth address, sol address, if address is wrong, please return null
- User's twitter handle

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "nickName": number | null,
    "walletAddress": string | null,
    "twitterHandle": string | null
}
\`\`\``;
