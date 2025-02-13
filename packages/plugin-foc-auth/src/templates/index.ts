export const getIdentityAuthTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
\`\`\`json
{
    "id": null,
    "nickname": "aipe",
    "description": "a monkey, favorite food is banana",
    "avatarUrl": "https://exmaple.com/1.png",
    "email": "aipe@google.com"
    "options": null,
}
\`\`\`

Recent messages:
{{recentMessages}}

Given the recent messages above, extract the following information about the requested user:
- User's unique ID (if not available, use null but not undefined)
- User's nickname (if unavailable, use null but not undefined)
- A brief description of the user (if unavailable, use null but not undefined)
- The user's avatar URL (if unavailable, use null but not undefined)
- The user's email address (if unavailable, use null but not undefined)
- Any additional options as a string (if unavailable, use null but not undefined)

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "id": string | null,
    "nickname": string | null,
    "description": string | null,
    "avatarUrl": string | null,
    "email": string | null
    "options": string | null,
}
\`\`\``;
