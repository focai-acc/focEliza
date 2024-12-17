import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { elizaLogger } from "@ai16z/eliza";

export class Store {
    db: Promise<Database>;

    constructor() {
        this.db = this.initializeDatabase();
    }
    async tableExists(db: Database, tableName: string): Promise<boolean> {
        const result = await db.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`,
            tableName
        );
        return result !== undefined;
    }

    async initializeDatabase(): Promise<Database> {
        const db = await open({
            filename: "../xscores.db", // 数据库文件
            driver: sqlite3.Database,  // 使用 sqlite3 驱动
        });

        const tableName = "scores";

        const exists = await this.tableExists(db, tableName);

        if (!exists) {
            elizaLogger.log(`Table '${tableName}' does not exist. Initializing...`);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    original_tweet_time TEXT NOT NULL,
                    aivinci_reply_time TEXT NOT NULL,
                    original_tweet_url TEXT NOT NULL,
                    aivinci_score_tweet TEXT NOT NULL,
                    score REAL NOT NULL
                );
            `);

            elizaLogger.log(`create idx for table ${tableName}`);
            await db.exec(`
                CREATE INDEX idx_original_tweet_time ON scores(original_tweet_time);
                CREATE INDEX idx_aivinci_reply_time ON scores(aivinci_reply_time);
                CREATE INDEX idx_original_tweet_url ON scores(original_tweet_url);
                CREATE INDEX idx_aivinci_score_tweet ON scores(aivinci_score_tweet);
                CREATE INDEX idx_score ON scores(score);
            `);

            elizaLogger.log(`Table '${tableName}' has been created.`);
        } else {
            elizaLogger.log(`Table '${tableName}' already exists. Skipping initialization.`);
        }

        return db;
    }

    async storeTweet(originalTweetTime: string, aivinciReplyTime: string, originalTweetUrl: string, aivinciScoreTweet: string) {
        let score = await this.extractSingleScore(aivinciScoreTweet);

        if (score === null) {
            score = 0;
        }

        originalTweetTime = originalTweetTime || '';
        aivinciReplyTime = aivinciReplyTime || '';
        originalTweetUrl = originalTweetUrl || '';
        aivinciScoreTweet = aivinciScoreTweet || '';

        const database = await this.db;
        const stmt = await database.prepare(`
            INSERT INTO scores (original_tweet_time, aivinci_reply_time, original_tweet_url, aivinci_score_tweet, score)
            VALUES (?, ?, ?, ?, ?)
        `);

        try {
            stmt.run(originalTweetTime, aivinciReplyTime, originalTweetUrl, aivinciScoreTweet, score);
        } catch (error) {
            elizaLogger.log("store failed", originalTweetTime, aivinciReplyTime, originalTweetUrl, aivinciScoreTweet, score);
        }
    }

    async extractSingleScore(text: string): Promise<number | null> {
        const ratingKeywords = ["score", "rating", "relevance", "rate"];
        const sentences = text.split(/[.,!?;]\s*/);
        const regex = /\b([1-9][0-9]?)\b/g;

        let fallbackScore: number | null = null;

        for (const sentence of sentences) {
            const matches = Array.from(sentence.matchAll(regex)).map(match => Number(match[0]));
            if (matches.length === 0) {
                continue;
            }

            const containsKeyword = ratingKeywords.some(keyword => sentence.includes(keyword));
            if (containsKeyword) {
                if (matches.length === 1) {
                    return matches[0];
                } else {
                    if (fallbackScore === null) {
                        fallbackScore = matches[0];
                    }
                }
            }

            if (fallbackScore === null) {
                fallbackScore = matches[0];
            }
        }

        return fallbackScore;
    }
}
