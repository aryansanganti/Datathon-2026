import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const API = "/api"

interface GraphStatus {
  status: string
  message: string
  features?: string[]
}

interface GraphNode {
  id: string
  type: 'user' | 'issue' | 'project' | 'commit'
  label: string
  data: Record<string, unknown>
}

interface GraphEdge {
  source: string
  target: string
  type: string
  data?: Record<string, unknown>
}

interface GraphData {
  nodes: GraphNode[]
  edges?: GraphEdge[]
  meta?: {
    userCount?: number
    issueCount?: number
    assignmentEdges?: number
    commitEdges?: number
  }
}

export function KnowledgeGraph() {
  const [status, setStatus] = useState<GraphStatus | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'status' | 'nodes' | 'preview'>('status')

  useEffect(() => {
    fetch(`${API}/graph/status`)
      .then(r => r.json())
      .then(data => {
        setStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch graph status:", err)
        setLoading(false)
      })
  }, [])

  const loadNodes = async () => {
    setLoading(true)
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch(`${API}/graph/nodes`).then(r => r.json()),
        fetch(`${API}/graph/edges`).then(r => r.json())
      ])
      setGraphData({
        nodes: nodesRes.nodes || [],
        edges: edgesRes.edges || [],
        meta: { ...nodesRes.meta, ...edgesRes.meta }
      })
      setView('nodes')
    } catch (err) {
      console.error("Failed to load graph data:", err)
    }
    setLoading(false)
  }

  const syncGraph = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/graph/sync`, { method: 'POST' })
      const data = await res.json()
      console.log("Sync result:", data)
      // Reload nodes after sync
      await loadNodes()
    } catch (err) {
      console.error("Sync failed:", err)
    }
    setLoading(false)
  }

  if (loading && !graphData) {
    return (
      <div className="w-full max-w-4xl">
        <p className="text-muted-foreground">Loading knowledge graph...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Knowledge Graph</h2>
        <div className="flex gap-2">
          <Button 
            variant={view === 'status' ? 'default' : 'outline'} 
            onClick={() => setView('status')}
          >
            Status
          </Button>
          <Button 
            variant={view === 'nodes' ? 'default' : 'outline'} 
            onClick={loadNodes}
          >
            View Data
          </Button>
          <Button variant="outline" onClick={syncGraph} disabled={loading}>
            Sync Graph
          </Button>
        </div>
      </div>

      {view === 'status' && status && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-4 w-4 rounded-full ${
                status.status === 'pending_implementation' ? 'bg-yellow-500' : 
                status.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-medium capitalize">{status.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-muted-foreground">{status.message}</p>
          </div>

          {status.features && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-medium mb-3">Planned Features</h3>
              <ul className="space-y-2">
                {status.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Architecture Preview */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-medium mb-3">Graph Architecture</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Nodes:</strong> Users, Issues, Projects, Commits, Skills</p>
              <p><strong>Relationships:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• User → ASSIGNED_TO → Issue</li>
                <li>• User → CONTRIBUTED_TO → Commit</li>
                <li>• User → MEMBER_OF → Team</li>
                <li>• Issue → BELONGS_TO → Project</li>
                <li>• Commit → REFERENCES → Issue</li>
                <li>• User → HAS_SKILL → Skill (inferred from commits)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === 'nodes' && graphData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-2xl font-bold">{graphData.meta?.userCount || 0}</div>
              <div className="text-xs text-muted-foreground">Users</div>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-2xl font-bold">{graphData.meta?.issueCount || 0}</div>
              <div className="text-xs text-muted-foreground">Issues</div>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-2xl font-bold">{graphData.meta?.assignmentEdges || 0}</div>
              <div className="text-xs text-muted-foreground">Assignments</div>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-2xl font-bold">{graphData.meta?.commitEdges || 0}</div>
              <div className="text-xs text-muted-foreground">Contributions</div>
            </div>
          </div>

          {/* Graph Visualization Placeholder */}
          <div className="rounded-xl border bg-card p-6 min-h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <svg className="w-24 h-24 mx-auto mb-4 opacity-50" viewBox="0 0 100 100">
                <circle cx="50" cy="30" r="8" fill="currentColor" />
                <circle cx="25" cy="70" r="8" fill="currentColor" />
                <circle cx="75" cy="70" r="8" fill="currentColor" />
                <line x1="50" y1="38" x2="25" y2="62" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="38" x2="75" y2="62" stroke="currentColor" strokeWidth="2" />
                <line x1="33" y1="70" x2="67" y2="70" stroke="currentColor" strokeWidth="2" />
              </svg>
              <p className="font-medium">Graph Visualization Coming Soon</p>
              <p className="text-sm mt-2">
                Interactive node visualization with D3.js or similar will be implemented
              </p>
            </div>
          </div>

          {/* Node List */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 font-medium">
              Nodes ({graphData.nodes.length})
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {graphData.nodes.slice(0, 20).map(node => (
                <div key={node.id} className="px-4 py-2 border-t flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    node.type === 'user' ? 'bg-blue-100 text-blue-800' :
                    node.type === 'issue' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {node.type}
                  </span>
                  <span className="font-medium">{node.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {node.type === 'user' && (node.data as { role?: string })?.role}
                    {node.type === 'issue' && (node.data as { status?: string })?.status}
                  </span>
                </div>
              ))}
              {graphData.nodes.length > 20 && (
                <div className="px-4 py-2 border-t text-center text-sm text-muted-foreground">
                  ... and {graphData.nodes.length - 20} more nodes
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
