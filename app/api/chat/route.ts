import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { checkRateLimit, incrementCount, getRemainingInfo } from "./rate-limiter";

// データフォルダのパス
const DATA_DIR = path.join(process.cwd(), "data");

// GET: 残り回数を返す
export async function GET() {
    const info = getRemainingInfo();
    return NextResponse.json(info);
}

// data/ フォルダ内の全 .md ファイル名を取得
function getAvailableTopics(): { filename: string; name: string }[] {
    try {
        const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".md"));
        return files.map((f) => ({
            filename: f,
            name: f.replace(".md", ""),
        }));
    } catch {
        return [];
    }
}

// 指定ファイルの内容を読み込み
function readTopicFile(filename: string): string {
    try {
        const filePath = path.join(DATA_DIR, filename);
        return fs.readFileSync(filePath, "utf-8");
    } catch {
        return "";
    }
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

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 利用可能なトピック一覧を取得
        const topics = getAvailableTopics();

        let context = "";

        if (topics.length === 0) {
            context = "（資料が登録されていません。一般的な知識で回答します。）";
        } else if (topics.length <= 2) {
            // ファイルが2つ以下なら全部読み込む（分類不要）
            context = topics
                .map((t) => `## ${t.name}\n${readTopicFile(t.filename)}`)
                .join("\n\n---\n\n");
        } else {
            // Step 1: AIにどのファイルが関連するか判定させる
            const topicList = topics.map((t) => t.name).join("\n- ");
            const classifyPrompt = `
以下のカテゴリの中から、ユーザーの質問に回答するために必要なカテゴリを選んでください。
最大3つまで選べます。カテゴリ名だけをカンマ区切りで回答してください。余計な説明は不要です。

【カテゴリ一覧】
- ${topicList}

【ユーザーの質問】
${message}

【回答形式】
カテゴリ名1,カテゴリ名2
`;

            const classifyResult = await model.generateContent(classifyPrompt);
            const classifyResponse = await classifyResult.response;
            const selectedNames = classifyResponse
                .text()
                .split(",")
                .map((s) => s.trim());

            // 選択されたファイルを読み込む
            const selectedTopics = topics.filter((t) =>
                selectedNames.some(
                    (name) => t.name.includes(name) || name.includes(t.name)
                )
            );

            if (selectedTopics.length === 0) {
                // マッチしなかった場合は全ファイルの先頭部分だけ読む
                context = topics
                    .map((t) => {
                        const content = readTopicFile(t.filename);
                        return `## ${t.name}\n${content.slice(0, 500)}...`;
                    })
                    .join("\n\n---\n\n");
            } else {
                context = selectedTopics
                    .map((t) => `## ${t.name}\n${readTopicFile(t.filename)}`)
                    .join("\n\n---\n\n");
            }
        }

        // Step 2: 選択された資料を使って回答を生成
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
