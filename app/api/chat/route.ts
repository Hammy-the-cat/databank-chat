import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { checkRateLimit, incrementCount, getRemainingInfo } from "./rate-limiter";

// Define the path to the instructional materials
const INSTRUCTION_FILE_PATH = path.join(process.cwd(), "data", "materials.md");

// GET: 残り回数を返す
export async function GET() {
    const info = getRemainingInfo();
    return NextResponse.json(info);
}

export async function POST(req: Request) {
    try {
        // レート制限チェック
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: "本日の利用上限に達しました。明日またお試しください。", remaining: 0, limit: rateCheck.limit },
                { status: 429 }
            );
        }

        const { message } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GOOGLE_GEMINI_API_KEY is not set" },
                { status: 500 }
            );
        }

        // Read the content of the instructional material
        let context = "";
        try {
            if (fs.existsSync(INSTRUCTION_FILE_PATH)) {
                context = fs.readFileSync(INSTRUCTION_FILE_PATH, "utf-8");
            } else {
                context = "（資料が見つかりませんでした。一般的な知識で回答します。）";
            }
        } catch (error) {
            console.error("Error reading file:", error);
            context = "（資料の読み込みに失敗しました。）";
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
あなたは「データバンクAI」です。
以下の「参考資料」の内容に基づいて、教員からの質問に答えてください。


【資料の内容】
${context}

【ユーザーの質問】
${message}

【回答のガイドライン】
- あなたは「データバンクAI」です。教員向けの情報データベースとして、正確かつ簡潔に情報を提供してください。
- 口調は丁寧で知的に。「です・ます」調で回答してください。
- 「資料に書いてあるけど」や「〇〇ページによると」といった前置きは一切不要です。資料の内容を完全に咀嚼し、自分の知識として自然に回答してください。
- 質問に対して、的確な情報と解決策をわかりやすく整理して答えてください。
- Markdownの太字表記（**）は使わないでください。強調したい部分は、かぎ括弧「」や記号（！など）を使って表現してください。
- 必要に応じて箇条書きを活用し、情報を見やすく構造化してください。
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 成功時にカウントを増やす
        incrementCount();
        const remaining = getRemainingInfo();

        return NextResponse.json({ reply: text, remaining: remaining.remaining, limit: remaining.limit });
    } catch (error: unknown) {
        console.error("Error in chat API:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            { error: "Internal Server Error", details: errorMessage },
            { status: 500 }
        );
    }
}
