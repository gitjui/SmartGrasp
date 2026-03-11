import { FeedbackReportClient } from "@/components/feedback-report-client"

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <FeedbackReportClient />
      </div>
    </main>
  )
}
