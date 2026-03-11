"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Eraser, Paintbrush, Pause, Play, RotateCcw, Trash2 } from "lucide-react"
import html2canvas from "html2canvas"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import questionsData from "@/questions/data.json"

const STORAGE_KEY = "smartgrasp-whiteboard-v1"
const ANSWERS_STORAGE_KEY = "smartgrasp-mcq-answers-v1"
const ACTIVE_QUESTION_STORAGE_KEY = "smartgrasp-active-question-v1"
const TIMER_STORAGE_KEY = "smartgrasp-mcq-timer-v1"
const PRACTICE_LOCK_STORAGE_KEY = "smartgrasp-practice-locked-v1"
const DEFAULT_COLOR = "#111827"
const DEFAULT_SIZE = 4
const DEFAULT_TIMER_SECONDS = 15 * 60

type RawQuestion = {
  option1: string
  option2: string
  option3: string
  option4: string
  answer: "option1" | "option2" | "option3" | "option4"
  marks: number
  images: string[]
  [key: string]: string | number | string[]
}

type NormalizedQuestion = {
  id: number
  prompt: string
  options: Array<{ key: "option1" | "option2" | "option3" | "option4"; label: string }>
  answer: "option1" | "option2" | "option3" | "option4"
  marks: number
  images: string[]
}

export function WhiteboardCanvas() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const questionPanelRef = useRef<HTMLDivElement | null>(null)

  const [color, setColor] = useState(DEFAULT_COLOR)
  const [brushSize, setBrushSize] = useState(DEFAULT_SIZE)
  const [isErasing, setIsErasing] = useState(false)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, "option1" | "option2" | "option3" | "option4">>({})
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIMER_SECONDS)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isPracticeLocked, setIsPracticeLocked] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [aiFeedback, setAiFeedback] = useState("")
  const [aiError, setAiError] = useState("")
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  const questions = useMemo<NormalizedQuestion[]>(() => {
    return (questionsData as unknown as RawQuestion[])
      .map((question, index) => {
        const promptEntry = Object.entries(question).find(([key]) => key.startsWith("q"))
        const prompt = typeof promptEntry?.[1] === "string" ? promptEntry[1] : `Question ${index + 1}`

        return {
          id: index + 1,
          prompt,
          options: ["option1", "option2", "option3", "option4"].map((optionKey) => ({
            key: optionKey as "option1" | "option2" | "option3" | "option4",
            label: String(question[optionKey]),
          })),
          answer: question.answer,
          marks: question.marks,
          images: Array.isArray(question.images) ? question.images : [],
        }
      })
      .filter((question) => Boolean(question.prompt))
  }, [])

  const activeQuestion = questions[activeQuestionIndex]

  const scoreSummary = useMemo(() => {
    const totalQuestions = questions.length
    const attempted = Object.keys(selectedAnswers).length
    const correct = questions.reduce((count, question, index) => {
      return selectedAnswers[index] === question.answer ? count + 1 : count
    }, 0)

    const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0)
    const earnedMarks = questions.reduce((sum, question, index) => {
      return selectedAnswers[index] === question.answer ? sum + question.marks : sum
    }, 0)

    return {
      totalQuestions,
      attempted,
      correct,
      totalMarks,
      earnedMarks,
    }
  }, [questions, selectedAnswers])

  const strokeColor = useMemo(() => (isErasing ? "#ffffff" : color), [isErasing, color])

  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }, [])

  const saveCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      localStorage.setItem(STORAGE_KEY, canvas.toDataURL("image/png"))
    } catch {
      return
    }
  }, [])

  const drawLine = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      const ctx = getContext()
      if (!ctx) return

      ctx.strokeStyle = strokeColor
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    },
    [brushSize, getContext, strokeColor],
  )

  const getPointFromEvent = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }, [])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const point = getPointFromEvent(event)
      if (!point) return

      event.currentTarget.setPointerCapture(event.pointerId)
      isDrawing.current = true
      lastPoint.current = point

      drawLine(point.x, point.y, point.x, point.y)
    },
    [drawLine, getPointFromEvent],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return
      const point = getPointFromEvent(event)
      if (!point || !lastPoint.current) return

      drawLine(lastPoint.current.x, lastPoint.current.y, point.x, point.y)
      lastPoint.current = point
    },
    [drawLine, getPointFromEvent],
  )

  const finishDrawing = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPoint.current = null
    saveCanvas()
  }, [saveCanvas])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    localStorage.removeItem(STORAGE_KEY)
  }, [getContext])

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const data = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = data
    a.download = `whiteboard-${Date.now()}.png`
    a.click()
  }, [])

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const width = container.clientWidth
    const height = Math.max(480, window.innerHeight - 210)

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.scale(dpr, dpr)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    const savedData = localStorage.getItem(STORAGE_KEY)
    if (!savedData) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
    }
    img.src = savedData
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient()

      if (!supabase) {
        setAiError("Supabase is not configured. Please set environment variables.")
        setIsAuthChecking(false)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      setIsAuthChecking(false)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    initializeCanvas()
    const onResize = () => initializeCanvas()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [initializeCanvas])

  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem(ANSWERS_STORAGE_KEY)
      const savedActiveQuestion = localStorage.getItem(ACTIVE_QUESTION_STORAGE_KEY)
      const savedTimer = localStorage.getItem(TIMER_STORAGE_KEY)
      const savedPracticeLock = localStorage.getItem(PRACTICE_LOCK_STORAGE_KEY)

      if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers) as Record<string, "option1" | "option2" | "option3" | "option4">
        const restored: Record<number, "option1" | "option2" | "option3" | "option4"> = {}

        for (const [key, value] of Object.entries(parsedAnswers)) {
          const index = Number(key)
          if (!Number.isNaN(index)) {
            restored[index] = value
          }
        }

        setSelectedAnswers(restored)
      }

      if (savedActiveQuestion) {
        const parsedIndex = Number(savedActiveQuestion)
        if (!Number.isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < questions.length) {
          setActiveQuestionIndex(parsedIndex)
        }
      }

      if (savedTimer) {
        const parsedTimer = JSON.parse(savedTimer) as { secondsLeft: number; isTimerRunning: boolean; isSubmitted: boolean }
        if (typeof parsedTimer.secondsLeft === "number") {
          setSecondsLeft(Math.max(0, parsedTimer.secondsLeft))
        }
        if (typeof parsedTimer.isTimerRunning === "boolean") {
          setIsTimerRunning(parsedTimer.isTimerRunning)
        }
        if (typeof parsedTimer.isSubmitted === "boolean") {
          setIsSubmitted(parsedTimer.isSubmitted)
        }
      }

      if (savedPracticeLock) {
        setIsPracticeLocked(true)
        setIsSubmitted(true)
        setIsTimerRunning(false)
      }
    } catch {
      return
    }
  }, [questions.length])

  useEffect(() => {
    try {
      localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(selectedAnswers))
    } catch {
      return
    }
  }, [selectedAnswers])

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_QUESTION_STORAGE_KEY, String(activeQuestionIndex))
    } catch {
      return
    }
  }, [activeQuestionIndex])

  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          secondsLeft,
          isTimerRunning,
          isSubmitted,
        }),
      )
    } catch {
      return
    }
  }, [isSubmitted, isTimerRunning, secondsLeft])

  useEffect(() => {
    if (!isTimerRunning) return
    if (secondsLeft <= 0) {
      setIsTimerRunning(false)
      return
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isTimerRunning, secondsLeft])

  const formatTime = useCallback((totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }, [])

  const handleAnswerSelect = useCallback((option: "option1" | "option2" | "option3" | "option4") => {
    if (isSubmitted) return
    setSelectedAnswers((previous) => ({
      ...previous,
      [activeQuestionIndex]: option,
    }))
  }, [activeQuestionIndex, isSubmitted])

  const handleSubmitQuiz = useCallback(async () => {
    if (isPracticeLocked || isSubmitted) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setAiError("Supabase is not configured. Please set environment variables.")
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      router.push("/login")
      return
    }

    setIsSubmitted(true)
    setIsPracticeLocked(true)
    setIsTimerRunning(false)
    setIsGeneratingReport(true)
    setAiFeedback("")
    setAiError("")

    try {
      localStorage.setItem(
        PRACTICE_LOCK_STORAGE_KEY,
        JSON.stringify({
          submittedAt: new Date().toISOString(),
        }),
      )
    } catch {}

    try {
      const formData = new FormData()

      const captureTargets: Array<{ element: HTMLElement | null; name: string }> = [
        { element: questionPanelRef.current, name: "question-panel" },
        { element: containerRef.current, name: "canvas-board" },
      ]

      for (const target of captureTargets) {
        if (!target.element) continue
        const screenshotCanvas = await html2canvas(target.element, {
          backgroundColor: "#ffffff",
          scale: 1.5,
          useCORS: true,
        })

        const screenshotBlob = await new Promise<Blob | null>((resolve) => {
          screenshotCanvas.toBlob((blob) => resolve(blob), "image/png")
        })

        if (!screenshotBlob) continue

        const screenshotFile = new File([screenshotBlob], `${target.name}.png`, {
          type: "image/png",
        })
        formData.append("screenshots", screenshotFile)
      }

      formData.append(
        "contextNotes",
        [
          `Quiz summary: ${scoreSummary.correct}/${scoreSummary.totalQuestions} correct`,
          `Marks: ${scoreSummary.earnedMarks}/${scoreSummary.totalMarks}`,
          `Attempted: ${scoreSummary.attempted}/${scoreSummary.totalQuestions}`,
          `Remaining time: ${formatTime(secondsLeft)}`,
          `Selected answers by question index: ${JSON.stringify(selectedAnswers)}`,
        ].join("\n"),
      )

      const response = await fetch("/api/feedback-report", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = (await response.json()) as { report?: string; error?: string }

      if (!response.ok) {
        setAiError(data.error ?? "Failed to generate feedback report.")
        return
      }

      setAiFeedback(data.report ?? "No feedback returned.")
    } catch {
      setAiError("Unable to generate feedback at the moment. Please try again.")
    } finally {
      setIsGeneratingReport(false)
    }
  }, [formatTime, isPracticeLocked, isSubmitted, router, scoreSummary, secondsLeft, selectedAnswers])

  if (isAuthChecking) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Checking login...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <div ref={questionPanelRef} className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Question {activeQuestion?.id ?? 1} of {questions.length}</p>
            <h2 className="text-lg font-semibold">MCQ Practice</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-md border px-3 py-2 text-sm font-medium">Time: {formatTime(secondsLeft)}</div>
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitted}
              onClick={() => setIsTimerRunning((previous) => !previous)}
            >
              {isTimerRunning ? <Pause /> : <Play />}
              {isTimerRunning ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitted}
              onClick={() => {
                setSecondsLeft(DEFAULT_TIMER_SECONDS)
                setIsTimerRunning(true)
              }}
            >
              <RotateCcw />
              Reset
            </Button>
          </div>
        </div>

        {activeQuestion && (
          <div className="space-y-4">
            <p className="text-base font-medium leading-relaxed">{activeQuestion.prompt}</p>

            {activeQuestion.images.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeQuestion.images.map((imageName) => (
                  <img
                    key={imageName}
                    src={`/api/question-image/${encodeURIComponent(imageName)}`}
                    alt={`Question ${activeQuestion.id} visual`}
                    className="w-full rounded-lg border bg-background object-contain"
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {activeQuestion.options.map((option, optionIndex) => {
                const isSelected = selectedAnswers[activeQuestionIndex] === option.key
                const optionLabel = String.fromCharCode(65 + optionIndex)

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleAnswerSelect(option.key)}
                    disabled={isSubmitted}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-semibold">{optionLabel}. </span>
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {questions.map((question, index) => {
            const isCurrent = index === activeQuestionIndex
            const isAnswered = Boolean(selectedAnswers[index])

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setActiveQuestionIndex(index)}
                aria-label={`Go to question ${question.id}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isAnswered
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {question.id}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">
            Attempted {scoreSummary.attempted}/{scoreSummary.totalQuestions}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isSubmitted ? (
              <Button
                disabled={isGeneratingReport}
                onClick={handleSubmitQuiz}
              >
                {isGeneratingReport ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <>
                <div className="rounded-md border px-3 py-2 text-sm font-medium">
                  Score: {scoreSummary.correct}/{scoreSummary.totalQuestions} · Marks: {scoreSummary.earnedMarks}/{scoreSummary.totalMarks}
                </div>
              </>
            )}
          </div>
        </div>

        {isPracticeLocked && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            One paper practice limit reached. This paper is locked after submission.
          </div>
        )}

        {isSubmitted && (
          <div className="space-y-2 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Detailed AI Feedback</h3>
            {isGeneratingReport && <p className="text-sm text-muted-foreground">Generating report from captured screenshots...</p>}
            {aiError && <p className="text-sm text-destructive">{aiError}</p>}
            {aiFeedback && <pre className="whitespace-pre-wrap text-sm leading-relaxed">{aiFeedback}</pre>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Button
            variant={isErasing ? "default" : "outline"}
            onClick={() => setIsErasing((prev) => !prev)}
          >
            {isErasing ? <Paintbrush /> : <Eraser />}
            {isErasing ? "Draw" : "Eraser"}
          </Button>
          <Button variant="outline" onClick={clearCanvas}>
            <Trash2 />
            Clear
          </Button>
          <Button variant="outline" onClick={saveCanvas}>
            <RotateCcw />
            Save
          </Button>
          <Button variant="outline" onClick={downloadCanvas}>
            <Download />
            Download
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <Label htmlFor="brush-color">Color</Label>
            <input
              id="brush-color"
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value)
                setIsErasing(false)
              }}
              className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
              aria-label="Select brush color"
            />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="brush-size" className="min-w-16">
              Brush {brushSize}px
            </Label>
            <Slider
              id="brush-size"
              min={1}
              max={40}
              step={1}
              value={[brushSize]}
              onValueChange={(values) => setBrushSize(values[0] ?? DEFAULT_SIZE)}
              className="max-w-md"
              aria-label="Brush size"
            />
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-xl border bg-white shadow-sm"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
          onPointerCancel={finishDrawing}
          role="img"
          aria-label="Interactive whiteboard canvas"
        />
      </div>
    </div>
  )
}
