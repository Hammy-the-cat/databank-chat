// Simple in-memory daily rate limiter
// Note: On Vercel serverless, this resets on cold starts. For production, use Redis or a database.

const DAILY_LIMIT = 100; // 1日あたりの上限回数

interface RateLimitState {
    count: number;
    date: string; // YYYY-MM-DD format
}

const state: RateLimitState = {
    count: 0,
    date: new Date().toISOString().split("T")[0],
};

function getTodayString(): string {
    return new Date().toISOString().split("T")[0];
}

function resetIfNewDay(): void {
    const today = getTodayString();
    if (state.date !== today) {
        state.count = 0;
        state.date = today;
    }
}

export function checkRateLimit(): { allowed: boolean; remaining: number; limit: number } {
    resetIfNewDay();

    if (state.count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0, limit: DAILY_LIMIT };
    }

    return { allowed: true, remaining: DAILY_LIMIT - state.count, limit: DAILY_LIMIT };
}

export function incrementCount(): void {
    resetIfNewDay();
    state.count++;
}

export function getRemainingInfo(): { remaining: number; limit: number; used: number } {
    resetIfNewDay();
    return {
        remaining: Math.max(0, DAILY_LIMIT - state.count),
        limit: DAILY_LIMIT,
        used: state.count,
    };
}
