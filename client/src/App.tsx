import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const API = "/api"

type Health = { status: string; db?: string }
type Metrics = {
  by_source_entity: Record<string, { success_count: number; fail_count: number; last_latency_ms: number | null }>
  last_sync: Record<string, { last_sync_at: string | null; last_cursor: string | null }>
}

type AllocationResult = {
  sprint_id: string | null
  sprint_name: string
  issues_created: number
  assignments: { task_id: string; jira_key: string; assigned_to: string }[]
  message?: string
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)
  const [allocationProjectKey, setAllocationProjectKey] = useState("")
  const [allocationBoardId, setAllocationBoardId] = useState("")
  const [allocationSprintName, setAllocationSprintName] = useState("")
  const [allocationDurationDays, setAllocationDurationDays] = useState(14)
  const [allocationLoading, setAllocationLoading] = useState(false)
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null)
  const [allocationError, setAllocationError] = useState<string | null>(null)
  const [allocationHistory, setAllocationHistory] = useState<{ sprint_name: string; issues_created: number; created_at: string }[]>([])

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }))
  }, [])

  useEffect(() => {
    fetch(`${API}/metrics`)
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => setMetrics(null))
  }, [])

  useEffect(() => {
    fetch(`${API}/oauth/github/status`)
      .then((r) => r.json())
      .then((d) => setGithubConnected(d.connected))
      .catch(() => setGithubConnected(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get("oauth")
    if (oauth === "success") setOauthMessage("GitHub connected successfully.")
    if (oauth === "error") setOauthMessage("GitHub connection failed.")
  }, [])

  const connectGitHub = () => {
    window.location.href = `${API}/oauth/github`
  }

  const runAllocation = async () => {
    setAllocationError(null)
    setAllocationResult(null)
    setAllocationLoading(true)
    try {
      const r = await fetch(`${API}/allocation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_key: allocationProjectKey,
          board_id: Number(allocationBoardId) || undefined,
          sprint_name: allocationSprintName,
          sprint_duration_days: allocationDurationDays,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || data.message || "Request failed")
      setAllocationResult(data)
      fetch(`${API}/allocation/history?limit=5`)
        .then((res) => res.json())
        .then(setAllocationHistory)
        .catch(() => {})
    } catch (e) {
      setAllocationError(e instanceof Error ? e.message : "Allocation failed")
    } finally {
      setAllocationLoading(false)
    }
  }

  useEffect(() => {
    fetch(`${API}/allocation/history?limit=5`)
      .then((r) => r.json())
      .then(setAllocationHistory)
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 gap-6">
      <h1 className="text-2xl font-bold text-foreground">Data Integration Hub</h1>

      {oauthMessage && (
        <div className="rounded-lg bg-muted px-4 py-2 text-sm text-foreground">
          {oauthMessage}
        </div>
      )}

      <section className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <span className="text-muted-foreground">Health</span>
          {health ? (
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  health.status === "ok" && health.db === "connected"
                    ? "bg-green-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                {health.status === "ok" ? "OK" : "Degraded"} {health.db && `(${health.db})`}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Loading…</span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <span className="text-muted-foreground">GitHub</span>
          {githubConnected === null ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : githubConnected ? (
            <span className="text-sm text-green-600">Connected</span>
          ) : (
            <Button onClick={connectGitHub}>Connect GitHub</Button>
          )}
        </div>
      </section>

      <section className="w-full max-w-lg space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Metrics</h2>
        {metrics ? (
          <div className="space-y-2">
            {Object.entries(metrics.by_source_entity).length === 0 &&
            Object.entries(metrics.last_sync).length === 0 ? (
              <p className="text-sm text-muted-foreground">No sync data yet.</p>
            ) : (
              <>
                {Object.entries(metrics.last_sync).map(([key, v]) => (
                  <div key={key} className="rounded-xl border bg-card p-4 text-sm">
                    <div className="font-medium text-foreground">{key}</div>
                    <div className="text-muted-foreground">
                      Last sync: {v.last_sync_at ? new Date(v.last_sync_at).toLocaleString() : "Never"}
                    </div>
                    {metrics.by_source_entity[key] && (
                      <div className="mt-1 text-muted-foreground">
                        Success: {metrics.by_source_entity[key].success_count} | Fail:{" "}
                        {metrics.by_source_entity[key].fail_count}
                        {metrics.by_source_entity[key].last_latency_ms != null &&
                          ` | Latency: ${metrics.by_source_entity[key].last_latency_ms}ms`}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading metrics…</p>
        )}
      </section>

      <section className="w-full max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Jira allocation</h2>
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <input
            className="w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="Project key (e.g. SCRUM)"
            value={allocationProjectKey}
            onChange={(e) => setAllocationProjectKey(e.target.value)}
          />
          <input
            className="w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="Board ID (number)"
            type="number"
            value={allocationBoardId}
            onChange={(e) => setAllocationBoardId(e.target.value)}
          />
          <input
            className="w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="Sprint name (e.g. Sprint 2026-02-08)"
            value={allocationSprintName}
            onChange={(e) => setAllocationSprintName(e.target.value)}
          />
          <input
            className="w-full rounded border bg-background px-3 py-2 text-sm"
            placeholder="Sprint duration (days)"
            type="number"
            min={1}
            value={allocationDurationDays}
            onChange={(e) => setAllocationDurationDays(parseInt(e.target.value, 10) || 14)}
          />
          <Button onClick={runAllocation} disabled={allocationLoading}>
            {allocationLoading ? "Running…" : "Run allocation"}
          </Button>
          {allocationError && (
            <p className="text-sm text-red-600">{allocationError}</p>
          )}
          {allocationResult && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Sprint: {allocationResult.sprint_name} ({allocationResult.issues_created} issues)</p>
              {allocationResult.assignments?.length > 0 && (
                <ul className="list-disc pl-4">
                  {allocationResult.assignments.slice(0, 10).map((a) => (
                    <li key={a.task_id}>{a.task_id} → {a.jira_key} ({a.assigned_to})</li>
                  ))}
                  {allocationResult.assignments.length > 10 && (
                    <li>… and {allocationResult.assignments.length - 10} more</li>
                  )}
                </ul>
              )}
              {allocationResult.message && <p>{allocationResult.message}</p>}
            </div>
          )}
        </div>
        {allocationHistory.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Recent runs</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {allocationHistory.map((run, i) => (
                <li key={i}>
                  {run.sprint_name} – {run.issues_created} issues – {run.created_at ? new Date(run.created_at).toLocaleString() : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
