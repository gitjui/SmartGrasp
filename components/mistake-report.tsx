"use client"

import { XCircle, CheckCircle, ChevronRight } from "lucide-react"

const mistakes = [
  {
    id: 1,
    topic: "Trigonometric Identities",
    question: "Simplify sin²x + cos²x",
    yourAnswer: "2",
    correctAnswer: "1",
    status: "wrong"
  },
  {
    id: 2,
    topic: "Quadratic Equations",
    question: "Solve x² - 5x + 6 = 0",
    yourAnswer: "x = 2, x = 4",
    correctAnswer: "x = 2, x = 3",
    status: "wrong"
  },
  {
    id: 3,
    topic: "Differentiation",
    question: "Find d/dx of x³",
    yourAnswer: "3x²",
    correctAnswer: "3x²",
    status: "correct"
  },
  {
    id: 4,
    topic: "Integration",
    question: "∫ 2x dx",
    yourAnswer: "x² + c",
    correctAnswer: "x² + c",
    status: "correct"
  },
  {
    id: 5,
    topic: "Geometry",
    question: "Area of circle with r = 5",
    yourAnswer: "50π",
    correctAnswer: "25π",
    status: "wrong"
  },
  {
    id: 6,
    topic: "Logarithms",
    question: "log₁₀(100)",
    yourAnswer: "3",
    correctAnswer: "2",
    status: "wrong"
  },
  {
    id: 7,
    topic: "Probability",
    question: "P(A ∪ B) if P(A)=0.3, P(B)=0.5, P(A∩B)=0.1",
    yourAnswer: "0.8",
    correctAnswer: "0.7",
    status: "wrong"
  },
  {
    id: 8,
    topic: "Vectors",
    question: "Magnitude of (3, 4)",
    yourAnswer: "5",
    correctAnswer: "5",
    status: "correct"
  },
  {
    id: 9,
    topic: "Algebra",
    question: "Expand (a + b)²",
    yourAnswer: "a² + b²",
    correctAnswer: "a² + 2ab + b²",
    status: "wrong"
  },
  {
    id: 10,
    topic: "Statistics",
    question: "Mean of 2, 4, 6, 8",
    yourAnswer: "4",
    correctAnswer: "5",
    status: "wrong"
  },
]

export function MistakeReport() {
  const wrongCount = mistakes.filter(m => m.status === "wrong").length
  const correctCount = mistakes.filter(m => m.status === "correct").length

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-6 py-5">
        <h3 className="text-xl font-bold text-white">Detailed Mistake Report</h3>
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-300" />
            <span className="text-white/90 text-sm">{wrongCount} mistakes</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-300" />
            <span className="text-white/90 text-sm">{correctCount} correct</span>
          </div>
        </div>
      </div>

      {/* Mistakes List */}
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {mistakes.map((mistake) => (
          <div 
            key={mistake.id} 
            className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {mistake.status === "wrong" ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded-full">
                    {mistake.topic}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {mistake.question}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs">
                  <span className={`${mistake.status === "wrong" ? "text-red-600" : "text-green-600"}`}>
                    Your answer: <span className="font-medium">{mistake.yourAnswer}</span>
                  </span>
                  {mistake.status === "wrong" && (
                    <span className="text-green-600">
                      Correct: <span className="font-medium">{mistake.correctAnswer}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#6366f1] transition-colors flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className="w-full py-3 bg-[#6366f1] hover:bg-[#5558e3] text-white font-medium rounded-xl transition-colors">
          Review All Mistakes
        </button>
      </div>
    </div>
  )
}
