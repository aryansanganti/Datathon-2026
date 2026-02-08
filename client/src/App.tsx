import { useState } from "react"
import TaskInputForm from "./TaskInputForm"
import AllocationGraph from "./AllocationGraph"
import AllocationSummary from "./AllocationSummary"
import { allocateTask } from "@/lib/api"
import type { AllocationResult } from "@/types/allocation"

export function TaskAllocation() {
  const [allocation, setAllocation] = useState<AllocationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (description: string, taskType?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await allocateTask(description, taskType)
      if (result.success) {
        setAllocation(result.allocation)
      } else {
        setError(result.error || "Something went wrong")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setAllocation(null)
    setError(null)
  }

  if (!allocation) {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        <TaskInputForm onSubmit={handleSubmit} isLoading={isLoading} />
        {error && (
          <div className="max-w-2xl w-full p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-[70vh] w-full flex overflow-hidden rounded-xl border bg-muted">
      <div className="flex-1 relative">
        <AllocationGraph allocation={allocation} />
      </div>
      <AllocationSummary allocation={allocation} onReset={handleReset} />
    </div>
  )
}
