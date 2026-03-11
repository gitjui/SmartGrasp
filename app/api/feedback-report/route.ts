import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Pool } from "pg"

const OPENAI_API_URL = "https://api.openai.com/v1/responses"
const DEFAULT_PAPER_ID = "paper-1"

export const runtime = "nodejs"

const databaseUrl = process.env.DATABASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    })
  : null

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64")
}

async function ensureAttemptsTable() {
  if (!pool) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS practice_attempts (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      paper_id TEXT NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, paper_id)
    )
  `)
}

async function registerAttempt(userId: string, paperId: string) {
  if (!pool) {
    return { ok: false, reason: "Database is not configured." }
  }

  await ensureAttemptsTable()

  const result = await pool.query(
    `
      INSERT INTO practice_attempts (user_id, paper_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, paper_id) DO NOTHING
      RETURNING id
    `,
    [userId, paperId],
  )

  return { ok: result.rowCount === 1 }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY environment variable." }, { status: 500 })
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase auth environment variables." },
        { status: 500 },
      )
    }

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : ""

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid authentication token." }, { status: 401 })
    }

    const attemptResult = await registerAttempt(user.id, DEFAULT_PAPER_ID)

    if (!attemptResult.ok) {
      if (attemptResult.reason) {
        return NextResponse.json({ error: attemptResult.reason }, { status: 500 })
      }
      return NextResponse.json(
        { error: "You have already submitted this paper." },
        { status: 409 },
      )
    }

    const formData = await request.formData()
    const contextNotes = String(formData.get("contextNotes") ?? "")

    const files = formData.getAll("screenshots").filter((item): item is File => item instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: "No screenshots uploaded." }, { status: 400 })
    }

    const imageInputs = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const base64 = toBase64(bytes)
        const mimeType = file.type || "image/png"

        return {
          type: "input_image" as const,
          image_url: `data:${mimeType};base64,${base64}`,
        }
      }),
    )

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "You are an expert math tutor and assessment reviewer.",
                  "Analyze the uploaded quiz/whiteboard screenshots and produce a detailed student feedback report.",
                  "Use this structure:",
                  "1) Overall Performance Summary",
                  "2) Accuracy and Common Mistakes",
                  "3) Step-by-step Improvement Plan",
                  "4) Topic-wise Strengths and Weaknesses",
                  "5) Recommended Practice Questions",
                  "6) Time-management feedback",
                  "Keep the report specific, actionable, and supportive.",
                  contextNotes ? `Additional context from app:\n${contextNotes}` : "",
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              },
              ...imageInputs,
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const message = typeof data?.error?.message === "string" ? data.error.message : "OpenAI request failed"
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const report = typeof data?.output_text === "string" ? data.output_text : "No report returned from OpenAI."

    return NextResponse.json({ report })
  } catch {
    return NextResponse.json({ error: "Failed to process feedback report request." }, { status: 500 })
  }
}
