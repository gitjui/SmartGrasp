"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type FeedbackApiResponse = {
  report?: string
  error?: string
}

export function FeedbackReportClient() {
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [contextNotes, setContextNotes] = useState("")
  const [report, setReport] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setReport("")

    if (screenshots.length === 0) {
      setError("Please upload at least one screenshot.")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      screenshots.forEach((file) => {
        formData.append("screenshots", file)
      })
      formData.append("contextNotes", contextNotes)

      const response = await fetch("/api/feedback-report", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as FeedbackApiResponse

      if (!response.ok) {
        setError(data.error ?? "Failed to generate report.")
        return
      }

      setReport(data.report ?? "No report returned.")
    } catch {
      setError("Unable to generate report right now. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" asChild>
        <Link href="/canvas">
          <ArrowLeft />
          Back to Canvas
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Report</CardTitle>
          <CardDescription>
            Upload screenshots from your quiz/canvas pages and generate a detailed learning report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="screenshots">Screenshots</Label>
              <input
                id="screenshots"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  setScreenshots(files)
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">Upload one or more screenshots (PNG/JPG/WebP).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contextNotes">Notes (optional)</Label>
              <Textarea
                id="contextNotes"
                placeholder="Add any context you want included in the report..."
                value={contextNotes}
                onChange={(event) => setContextNotes(event.target.value)}
                className="min-h-28"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : null}
              Generate Detailed Report
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>AI Report</CardTitle>
            <CardDescription>Generated from your uploaded screenshots.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{report}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
