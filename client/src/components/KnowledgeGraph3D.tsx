import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ForceGraph3D from "react-force-graph-3d"
import * as THREE from "three"
import { 
  Search, 
  RefreshCw, 
  Target, 
  X, 
  ChevronDown,
  ChevronRight,
  Users,
  GitCommit,
  FileText,
  Ticket,
  AlertTriangle,
  Flame,
  DollarSign,
  Zap,
  Layers,
  Eye,
  EyeOff,
  Info,
  ArrowLeft,
  Link2
} from "lucide-react"

const API = "/api"

// ============================================
// TYPE DEFINITIONS
// ============================================

interface GraphStatus {
  status: string
  message?: string
  features?: string[]
  stats?: {
    nodeCount: number
    relCount: number
    labels: Record<string, number>
    relTypes: Record<string, number>
  }
  connection?: {
    connected: boolean
    server: string
  }
}

interface GraphNode {
  id: string
  type: string
  label: string
  name?: string
  email?: string
  role?: string
  team?: string
  department?: string
  hourly_rate?: number
  status?: string
  priority?: string
  story_points?: number
  x?: number
  y?: number
  z?: number
  fx?: number
  fy?: number
  fz?: number
  [key: string]: unknown
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  meta?: {
    nodeCount: number
    linkCount: number
    nodesByType: {
      developers: number
      commits: number
      tickets: number
      files: number
    }
  }
  message?: string
}

interface InsightData {
  silos?: SiloData
  burnoutRisk?: BurnoutData
  hiddenCosts?: HiddenCostData
  velocity?: VelocityData
}

interface SiloData {
  count: number
  silos: Array<{
    file: string
    filename: string
    sole_owner: string
    risk_level: string
    total_commits: number
  }>
}

interface BurnoutData {
  count: number
  summary: {
    critical_risk: number
    high_risk: number
    medium_risk: number
    low_risk: number
  }
  developers: Array<{
    developer: string
    email: string
    commit_count: number
    risk_level: string
    repos: string[]
  }>
}

interface HiddenCostData {
  count: number
  summary: {
    total_tracked_cost: number
    avg_cost_per_ticket: number
  }
  tickets: Array<{
    ticket: string
    title: string
    total_cost: number
    status: string
  }>
}

interface VelocityData {
  count: number
  developers: Array<{
    developer: string
    email: string
    completed_tickets: number
    total_points: number
  }>
}

// ============================================
// DESIGN SYSTEM COLORS
// ============================================

const NODE_COLORS: Record<string, string> = {
  developer: "#0a0a0a",
  commit: "#525252",
  ticket: "#0a0a0a",
  file: "#737373",
  default: "#a3a3a3"
}

const ACCENT_COLORS: Record<string, string> = {
  developer: "#22c55e",
  commit: "#a855f7",
  ticket: "#3b82f6",
  file: "#f59e0b",
  default: "#6b7280"
}

const NODE_SIZES: Record<string, number> = {
  developer: 10,
  commit: 5,
  ticket: 8,
  file: 4
}

const LINK_COLORS: Record<string, string> = {
  AUTHORED: "#22c55e",
  LINKED_TO: "#3b82f6",
  MODIFIED: "#f59e0b",
  ASSIGNED_TO: "#ef4444",
  REFERENCES: "#a855f7",
  BELONGS_TO: "#06b6d4",
  MEMBER_OF: "#ec4899",
  HAS_SKILL: "#84cc16",
  default: "#404040"
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createNodeMesh(node: GraphNode, highlightSet: Set<string>) {
  const nodeType = node.type?.toLowerCase() || 'default'
  const size = NODE_SIZES[nodeType] || 5
  const baseColor = NODE_COLORS[nodeType] || NODE_COLORS.default
  const accentColor = ACCENT_COLORS[nodeType] || ACCENT_COLORS.default
  
  const group = new THREE.Group()
  
  // Main sphere - dark with accent ring
  const geometry = new THREE.SphereGeometry(size, 32, 32)
  const material = new THREE.MeshPhongMaterial({
    color: baseColor,
    transparent: highlightSet.size > 0 && !highlightSet.has(node.id),
    opacity: highlightSet.size > 0 && !highlightSet.has(node.id) ? 0.2 : 1,
    shininess: 100
  })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)
  
  // Accent ring
  const ringGeometry = new THREE.TorusGeometry(size * 1.2, size * 0.15, 8, 32)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: highlightSet.size > 0 && !highlightSet.has(node.id) ? 0.1 : 0.8
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = Math.PI / 2
  group.add(ring)
  
  // Glow effect for highlighted nodes
  if (highlightSet.has(node.id)) {
    const glowGeometry = new THREE.SphereGeometry(size * 1.8, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.15
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    group.add(glow)
  }
  
  // Label - BIGGER text for better visibility
  const label = node.name || node.label || node.id
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const font = 'bold 72px JetBrains Mono, monospace'
    ctx.font = font
    const textWidth = ctx.measureText(label).width
    canvas.width = textWidth + 60
    canvas.height = 96
    
    ctx.font = font
    ctx.fillStyle = highlightSet.size > 0 && !highlightSet.has(node.id) ? '#d4d4d4' : '#0a0a0a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, canvas.width / 2, canvas.height / 2)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(canvas.width * 0.08, canvas.height * 0.08, 1)
    sprite.position.set(0, size + 8, 0)
    group.add(sprite)
  }
  
  return group
}

// ============================================
// FILTER TOGGLE COMPONENT
// ============================================

interface FilterToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  count?: number
  color: string
  icon: React.ReactNode
}

const FilterToggle = ({ label, checked, onChange, count, color, icon }: FilterToggleProps) => (
  <motion.button
    onClick={() => onChange(!checked)}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`flex items-center gap-3 p-3 border-2 transition-all w-full ${
      checked 
        ? 'border-foreground bg-foreground text-background' 
        : 'border-border hover:border-muted-foreground'
    }`}
  >
    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
    <span className="flex-1 text-left font-mono text-xs uppercase tracking-wider">{label}</span>
    {icon}
    {count !== undefined && (
      <span className={`text-xs font-mono ${checked ? 'text-background/70' : 'text-muted-foreground'}`}>
        {count}
      </span>
    )}
  </motion.button>
)

// ============================================
// INSIGHT CARD COMPONENT  
// ============================================

interface InsightCardProps {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  selected: boolean
  onClick: () => void
  delay?: number
}

const InsightCard = ({ title, description, icon, color, selected, onClick, delay = 0 }: InsightCardProps) => (
  <motion.button
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    onClick={onClick}
    whileHover={{ x: 4 }}
    className={`w-full text-left p-4 border-2 transition-all ${
      selected 
        ? 'border-foreground bg-foreground text-background' 
        : 'border-border hover:border-muted-foreground'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 ${selected ? 'bg-background/20' : ''}`} style={{ color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs uppercase tracking-wider font-semibold">{title}</p>
        <p className={`text-[10px] mt-0.5 ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>
          {description}
        </p>
      </div>
    </div>
  </motion.button>
)

// ============================================
// MAIN COMPONENT
// ============================================

interface KnowledgeGraph3DProps {
  onBack?: () => void
}

export function KnowledgeGraph3D({ onBack }: KnowledgeGraph3DProps) {
  // State
  const [status, setStatus] = useState<GraphStatus | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [insights, setInsights] = useState<InsightData>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(true)
  const [showInsights, setShowInsights] = useState(false)
  const [showRelationships, setShowRelationships] = useState(false)
  const [connectedNodesList, setConnectedNodesList] = useState<Array<{node: GraphNode, linkType: string, direction: 'in' | 'out'}>>([])
  const [searchResults, setSearchResults] = useState<GraphNode[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState({
    showDevelopers: true,
    showCommits: true,
    showTickets: true,
    showFiles: true,
    nodeLimit: 200,
    searchQuery: "",
    selectedTeam: "all",
    selectedInsight: "none" as "none" | "silos" | "burnout" | "costs" | "velocity"
  })
  
  const graphRef = useRef<any>(null)

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/graph/status`)
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error("Failed to fetch graph status:", err)
    }
  }, [])

  const loadVisualization = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/graph/visualization?limit=${filters.nodeLimit}`)
      const data = await res.json()
      
      if (data.nodes && data.links) {
        const nodeIds = new Set(data.nodes.map((n: GraphNode) => n.id))
        data.links = data.links.filter((l: GraphLink) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source
          const targetId = typeof l.target === 'object' ? l.target.id : l.target
          return nodeIds.has(sourceId) && nodeIds.has(targetId)
        })
      }
      
      setGraphData(data)
    } catch (err) {
      console.error("Failed to load graph data:", err)
    }
    setLoading(false)
  }, [filters.nodeLimit])

  const fetchInsights = useCallback(async () => {
    setLoadingInsights(true)
    try {
      const [silosRes, burnoutRes, costsRes, velocityRes] = await Promise.all([
        fetch(`${API}/graph/insights/silos`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/graph/insights/burnout-risk`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/graph/insights/hidden-costs`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/graph/insights/ticket-velocity`).then(r => r.ok ? r.json() : null).catch(() => null)
      ])
      
      setInsights({
        silos: silosRes,
        burnoutRisk: burnoutRes,
        hiddenCosts: costsRes,
        velocity: velocityRes
      })
    } catch (err) {
      console.error("Failed to fetch insights:", err)
    }
    setLoadingInsights(false)
  }, [])

  const syncGraph = async () => {
    setSyncing(true)
    try {
      await fetch(`${API}/graph/sync`, { method: 'POST' })
      await Promise.all([fetchStatus(), loadVisualization(), fetchInsights()])
    } catch (err) {
      console.error("Sync failed:", err)
    }
    setSyncing(false)
  }

  // Initial load
  useEffect(() => {
    Promise.all([fetchStatus(), loadVisualization(), fetchInsights()])
      .finally(() => setLoading(false))
  }, [fetchStatus, loadVisualization, fetchInsights])

  // Configure force layout and initial camera position
  useEffect(() => {
    if (graphRef.current) {
      // Stronger charge for tighter clustering
      graphRef.current.d3Force('charge').strength(-80)
      // Shorter link distance to keep nodes closer
      graphRef.current.d3Force('link').distance(30)
      // Add center force to keep graph centered
      const d3 = graphRef.current.d3Force
      if (d3('center')) {
        d3('center').strength(1)
      }
      // Center and zoom in closer on initial load (much closer now)
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.cameraPosition({ x: 0, y: 0, z: 60 }, { x: 0, y: 0, z: 0 }, 1000)
          // Increase zoom sensitivity by reducing the controls' zoom speed divisor
          const controls = graphRef.current.controls()
          if (controls) {
            controls.zoomSpeed = 5.0  // Default is ~1.0, now 5x more sensitive
          }
        }
      }, 800)
    }
  }, [graphData])

  // ============================================
  // FILTERED DATA
  // ============================================

  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }
    
    const nodes = graphData.nodes.filter(node => {
      if (node.type === 'developer' && !filters.showDevelopers) return false
      if (node.type === 'commit' && !filters.showCommits) return false
      if (node.type === 'ticket' && !filters.showTickets) return false
      if (node.type === 'file' && !filters.showFiles) return false
      
      if (filters.selectedTeam !== 'all' && node.team && node.team !== filters.selectedTeam) return false
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const searchableText = `${node.label} ${node.name || ''} ${node.email || ''} ${node.team || ''}`.toLowerCase()
        if (!searchableText.includes(query)) return false
      }
      
      return true
    })
    
    const nodeIds = new Set(nodes.map(n => n.id))
    const links = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })
    
    return { nodes, links }
  }, [graphData, filters])

  const teams = useMemo(() => {
    if (!graphData) return []
    const teamSet = new Set<string>()
    graphData.nodes.forEach(n => {
      if (n.team) teamSet.add(n.team)
    })
    return Array.from(teamSet).sort()
  }, [graphData])

  // ============================================
  // INTERACTION HANDLERS
  // ============================================

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    setShowRelationships(false)
    
    const connectedNodes = new Set<string>([node.id])
    const connectedLinks = new Set<string>()
    const nodeConnections: Array<{node: GraphNode, linkType: string, direction: 'in' | 'out'}> = []
    
    // Build a map of nodes by id for quick lookup
    const nodesById = new Map<string, GraphNode>()
    filteredData.nodes.forEach(n => nodesById.set(n.id, n))
    
    filteredData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      
      if (sourceId === node.id) {
        connectedNodes.add(targetId)
        connectedLinks.add(`${sourceId}-${targetId}`)
        const targetNode = nodesById.get(targetId)
        if (targetNode) {
          nodeConnections.push({ node: targetNode, linkType: link.type, direction: 'out' })
        }
      }
      if (targetId === node.id) {
        connectedNodes.add(sourceId)
        connectedLinks.add(`${sourceId}-${targetId}`)
        const sourceNode = nodesById.get(sourceId)
        if (sourceNode) {
          nodeConnections.push({ node: sourceNode, linkType: link.type, direction: 'in' })
        }
      }
    })
    
    setConnectedNodesList(nodeConnections)
    setHighlightNodes(connectedNodes)
    setHighlightLinks(connectedLinks)
    
    if (graphRef.current && node.x !== undefined) {
      const distance = 30  // Much closer zoom when selecting a node
      const distRatio = 1 + distance / Math.hypot(node.x, node.y || 0, node.z || 0)
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1000
      )
    }
  }, [filteredData.links, filteredData.nodes])

  const handleConnectedNodeClick = useCallback((connectedNode: GraphNode) => {
    handleNodeClick(connectedNode)
  }, [handleNodeClick])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null)
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
    setShowRelationships(false)
    setConnectedNodesList([])
    setShowSearchResults(false)
    setSearchResults([])
  }, [])

  // Search and focus on a specific node
  const handleSearch = useCallback((query: string) => {
    if (!query.trim() || !graphData) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    
    const q = query.toLowerCase()
    const matches = graphData.nodes.filter(node => {
      const searchableText = `${node.label} ${node.name || ''} ${node.email || ''} ${node.team || ''}`.toLowerCase()
      return searchableText.includes(q)
    }).slice(0, 8) // Limit to 8 results
    
    setSearchResults(matches)
    setShowSearchResults(matches.length > 0)
  }, [graphData])

  const focusOnNode = useCallback((node: GraphNode) => {
    setShowSearchResults(false)
    
    // First, get the positioned node from current graph BEFORE changing filters
    let targetNode: GraphNode | null = null
    if (graphRef.current) {
      const graphInstance = graphRef.current
      const positionedNode = graphInstance.graphData().nodes.find(
        (n: GraphNode) => n.id === node.id
      )
      if (positionedNode && positionedNode.x !== undefined) {
        targetNode = positionedNode
      }
    }
    
    // Clear filters to ensure node is visible
    setFilters(f => ({
      ...f,
      searchQuery: '',
      showDevelopers: true,
      showCommits: true,
      showTickets: true,
      showFiles: true,
      selectedTeam: 'all'
    }))
    
    // If we found the positioned node, focus on it immediately
    if (targetNode && graphRef.current) {
      const distance = 25
      const distRatio = 1 + distance / Math.hypot(
        targetNode.x || 0, 
        targetNode.y || 0, 
        targetNode.z || 0
      )
      
      graphRef.current.cameraPosition(
        { 
          x: (targetNode.x || 0) * distRatio, 
          y: (targetNode.y || 0) * distRatio, 
          z: (targetNode.z || 0) * distRatio 
        },
        { x: targetNode.x || 0, y: targetNode.y || 0, z: targetNode.z || 0 },
        1500
      )
      
      // Highlight the node and its connections
      handleNodeClick(targetNode)
    } else {
      // Fallback: wait for graph to update then try again
      setTimeout(() => {
        if (graphRef.current) {
          const graphInstance = graphRef.current
          const positionedNode = graphInstance.graphData().nodes.find(
            (n: GraphNode) => n.id === node.id
          )
          
          if (positionedNode && positionedNode.x !== undefined) {
            const distance = 25
            const distRatio = 1 + distance / Math.hypot(
              positionedNode.x || 0, 
              positionedNode.y || 0, 
              positionedNode.z || 0
            )
            
            graphInstance.cameraPosition(
              { 
                x: positionedNode.x * distRatio, 
                y: (positionedNode.y || 0) * distRatio, 
                z: (positionedNode.z || 0) * distRatio 
              },
              { x: positionedNode.x, y: positionedNode.y || 0, z: positionedNode.z || 0 },
              1500
            )
            
            handleNodeClick(positionedNode)
          }
        }
      }, 200)
    }
  }, [handleNodeClick])

  const centerGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.cameraPosition({ x: 0, y: 0, z: 60 }, { x: 0, y: 0, z: 0 }, 1000)
    }
  }, [])

  // ============================================
  // RENDER CALLBACKS
  // ============================================

  const nodeThreeObject = useCallback((node: GraphNode) => {
    return createNodeMesh(node, highlightNodes)
  }, [highlightNodes])

  const getLinkColor = useCallback((link: GraphLink): string => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    const linkId = `${sourceId}-${targetId}`
    
    const baseColor = link.type && LINK_COLORS[link.type] ? LINK_COLORS[link.type] : LINK_COLORS.default
    
    if (highlightLinks.size > 0) {
      return highlightLinks.has(linkId) ? baseColor : "#e5e5e5"
    }
    
    return baseColor
  }, [highlightLinks])

  const getLinkWidth = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    const linkId = `${sourceId}-${targetId}`
    
    return highlightLinks.has(linkId) ? 3 : 1
  }, [highlightLinks])

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading && !graphData) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-border border-t-foreground mx-auto mb-6"
          />
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
            Loading Knowledge Graph...
          </p>
        </motion.div>
      </div>
    )
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="w-full h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="shrink-0 border-b-2 border-foreground bg-background z-10"
      >
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <motion.button
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </motion.button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-foreground flex items-center justify-center">
                <Layers className="w-5 h-5 text-background" />
              </div>
              <div>
                <h1 className="font-semibold tracking-tight">Knowledge Graph</h1>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Interactive Data Visualization
                </p>
              </div>
            </div>
            
            {status && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 ml-4 pl-4 border-l border-border"
              >
                <div className={`w-2 h-2 rounded-full ${
                  status.status === 'connected' ? 'bg-success animate-pulse' : 'bg-destructive'
                }`} />
                <span className="text-xs font-mono text-muted-foreground">
                  {status.stats?.nodeCount || 0} nodes • {status.stats?.relCount || 0} edges
                </span>
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border-2 font-mono text-xs uppercase tracking-wider transition-all ${
                showFilters ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'
              }`}
            >
              {showFilters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Filters
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const newState = !showInsights
                setShowInsights(newState)
                // Re-fetch insights when opening the panel
                if (newState) {
                  fetchInsights()
                }
              }}
              disabled={loadingInsights}
              className={`flex items-center gap-2 px-4 py-2 border-2 font-mono text-xs uppercase tracking-wider transition-all ${
                showInsights ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'
              } ${loadingInsights ? 'opacity-70' : ''}`}
            >
              {loadingInsights ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Info className="w-4 h-4" />
              )}
              {loadingInsights ? 'Loading...' : 'Insights'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={syncGraph}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </motion.button>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 shrink-0 border-r-2 border-border bg-background p-4 overflow-y-auto z-10"
            >
              {/* Search */}
              <motion.div {...slideUp} transition={{ delay: 0.1 }} className="mb-6">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Search & Focus
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <input
                    type="text"
                    placeholder="Search nodes..."
                    value={filters.searchQuery}
                    onChange={(e) => {
                      setFilters(f => ({ ...f, searchQuery: e.target.value }))
                      handleSearch(e.target.value)
                    }}
                    onFocus={() => {
                      if (filters.searchQuery && searchResults.length > 0) {
                        setShowSearchResults(true)
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border-2 border-border focus:border-foreground outline-none font-mono text-sm transition-colors"
                  />
                  
                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showSearchResults && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-64 overflow-y-auto"
                      >
                        <div className="p-2 border-b border-border">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} — Click to focus
                          </span>
                        </div>
                        {searchResults.map((node, i) => (
                          <motion.button
                            key={node.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => focusOnNode(node)}
                            className="w-full p-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex items-center gap-3"
                          >
                            <div 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: ACCENT_COLORS[node.type] || ACCENT_COLORS.default }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm truncate font-medium">{node.label}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{node.type}</p>
                            </div>
                            <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Node Type Filters */}
              <motion.div {...slideUp} transition={{ delay: 0.15 }} className="mb-6">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Node Types
                </label>
                <div className="space-y-2">
                  <FilterToggle
                    label="Developers"
                    checked={filters.showDevelopers}
                    onChange={(v) => setFilters(f => ({ ...f, showDevelopers: v }))}
                    count={graphData?.meta?.nodesByType?.developers}
                    color={ACCENT_COLORS.developer}
                    icon={<Users className="w-4 h-4" />}
                  />
                  <FilterToggle
                    label="Commits"
                    checked={filters.showCommits}
                    onChange={(v) => setFilters(f => ({ ...f, showCommits: v }))}
                    count={graphData?.meta?.nodesByType?.commits}
                    color={ACCENT_COLORS.commit}
                    icon={<GitCommit className="w-4 h-4" />}
                  />
                  <FilterToggle
                    label="Tickets"
                    checked={filters.showTickets}
                    onChange={(v) => setFilters(f => ({ ...f, showTickets: v }))}
                    count={graphData?.meta?.nodesByType?.tickets}
                    color={ACCENT_COLORS.ticket}
                    icon={<Ticket className="w-4 h-4" />}
                  />
                  <FilterToggle
                    label="Files"
                    checked={filters.showFiles}
                    onChange={(v) => setFilters(f => ({ ...f, showFiles: v }))}
                    count={graphData?.meta?.nodesByType?.files}
                    color={ACCENT_COLORS.file}
                    icon={<FileText className="w-4 h-4" />}
                  />
                </div>
              </motion.div>

              {/* Team Filter */}
              {teams.length > 0 && (
                <motion.div {...slideUp} transition={{ delay: 0.2 }} className="mb-6">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                    Team
                  </label>
                  <div className="relative">
                    <select
                      value={filters.selectedTeam}
                      onChange={(e) => setFilters(f => ({ ...f, selectedTeam: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-background border-2 border-border focus:border-foreground outline-none font-mono text-sm appearance-none cursor-pointer transition-colors"
                    >
                      <option value="all">All Teams</option>
                      {teams.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </motion.div>
              )}

              {/* Node Limit */}
              <motion.div {...slideUp} transition={{ delay: 0.25 }} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Node Limit
                  </label>
                  <span className="text-xs font-mono font-bold">{filters.nodeLimit}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={50}
                  value={filters.nodeLimit}
                  onChange={(e) => setFilters(f => ({ ...f, nodeLimit: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-muted rounded-none appearance-none cursor-pointer accent-foreground"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>50</span>
                  <span>500</span>
                </div>
              </motion.div>

              {/* Controls */}
              <motion.div {...slideUp} transition={{ delay: 0.3 }} className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Controls
                </label>
                <motion.button
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={centerGraph}
                  className="w-full flex items-center gap-3 p-3 border-2 border-border hover:border-foreground font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  <Target className="w-4 h-4" />
                  Center View
                </motion.button>
                <motion.button
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => loadVisualization()}
                  className="w-full flex items-center gap-3 p-3 border-2 border-border hover:border-foreground font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Data
                </motion.button>
                {selectedNode && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBackgroundClick}
                    className="w-full flex items-center gap-3 p-3 border-2 border-border hover:border-foreground font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Selection
                  </motion.button>
                )}
              </motion.div>

              {/* Legend */}
              <motion.div {...slideUp} transition={{ delay: 0.35 }} className="mt-6 pt-6 border-t-2 border-border">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Relationships
                </label>
                <div className="space-y-2">
                  {Object.entries(LINK_COLORS).filter(([k]) => k !== 'default').slice(0, 6).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
                      <span className="text-xs font-mono text-muted-foreground">{type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Graph Area */}
        <main className="flex-1 relative bg-background">
          <ForceGraph3D
            ref={graphRef}
            graphData={filteredData}
            nodeThreeObject={nodeThreeObject}
            nodeLabel={() => ''}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkOpacity={0.7}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            backgroundColor="#fafafa"
            showNavInfo={false}
            enableNodeDrag={true}
            enableNavigationControls={true}
            controlType="orbit"
          />

          {/* Stats Bar */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-4 left-4 flex items-center gap-4 bg-background/95 backdrop-blur-sm border-2 border-border px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className="text-xs font-mono">
                <span className="text-muted-foreground">Nodes:</span>{' '}
                <span className="font-bold">{filteredData.nodes.length}</span>
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono">
                <span className="text-muted-foreground">Edges:</span>{' '}
                <span className="font-bold">{filteredData.links.length}</span>
              </span>
            </div>
          </motion.div>

          {/* Instructions */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 right-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider"
          >
            Click: Select • Drag: Rotate • Scroll: Zoom
          </motion.div>
        </main>

        {/* Right Sidebar - Insights */}
        <AnimatePresence>
          {showInsights && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 shrink-0 border-l-2 border-border bg-background p-4 overflow-y-auto z-10"
            >
              {loadingInsights ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-border border-t-foreground mb-4"
                  />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Loading insights...
                  </p>
                </div>
              ) : (
                <>
              <motion.div {...slideUp} transition={{ delay: 0.1 }}>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  AI Insights
                </label>
                <div className="space-y-2">
                  <InsightCard
                    title="Burnout Risk"
                    description="Developers with high activity"
                    icon={<Flame className="w-5 h-5" />}
                    color="#ef4444"
                    selected={filters.selectedInsight === 'burnout'}
                    onClick={() => setFilters(f => ({ ...f, selectedInsight: f.selectedInsight === 'burnout' ? 'none' : 'burnout' }))}
                    delay={0.15}
                  />
                  <InsightCard
                    title="Knowledge Silos"
                    description="Single-owner files"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    color="#f59e0b"
                    selected={filters.selectedInsight === 'silos'}
                    onClick={() => setFilters(f => ({ ...f, selectedInsight: f.selectedInsight === 'silos' ? 'none' : 'silos' }))}
                    delay={0.2}
                  />
                  <InsightCard
                    title="Hidden Costs"
                    description="Ticket cost analysis"
                    icon={<DollarSign className="w-5 h-5" />}
                    color="#22c55e"
                    selected={filters.selectedInsight === 'costs'}
                    onClick={() => setFilters(f => ({ ...f, selectedInsight: f.selectedInsight === 'costs' ? 'none' : 'costs' }))}
                    delay={0.25}
                  />
                  <InsightCard
                    title="Velocity"
                    description="Developer throughput"
                    icon={<Zap className="w-5 h-5" />}
                    color="#3b82f6"
                    selected={filters.selectedInsight === 'velocity'}
                    onClick={() => setFilters(f => ({ ...f, selectedInsight: f.selectedInsight === 'velocity' ? 'none' : 'velocity' }))}
                    delay={0.3}
                  />
                </div>
              </motion.div>

              {/* Insight Details */}
              <AnimatePresence mode="wait">
                {filters.selectedInsight !== 'none' && (
                  <motion.div
                    key={filters.selectedInsight}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 pt-6 border-t-2 border-border"
                  >
                    {filters.selectedInsight === 'burnout' && insights.burnoutRisk && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            { label: 'Critical', value: insights.burnoutRisk.summary.critical_risk, color: 'text-red-500' },
                            { label: 'High', value: insights.burnoutRisk.summary.high_risk, color: 'text-orange-500' },
                            { label: 'Medium', value: insights.burnoutRisk.summary.medium_risk, color: 'text-yellow-500' },
                            { label: 'Low', value: insights.burnoutRisk.summary.low_risk, color: 'text-green-500' }
                          ].map((item, i) => (
                            <motion.div 
                              key={item.label}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="border-2 border-border p-3 text-center"
                            >
                              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                              <div className="text-[10px] font-mono text-muted-foreground uppercase">{item.label}</div>
                            </motion.div>
                          ))}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {insights.burnoutRisk.developers.slice(0, 8).map((dev, i) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + i * 0.05 }}
                              className="flex items-center justify-between p-2 border border-border"
                            >
                              <span className="text-sm font-mono truncate flex-1">{dev.developer}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 ${
                                dev.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-500' :
                                dev.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-500' :
                                dev.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-green-500/20 text-green-500'
                              }`}>{dev.risk_level}</span>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}
                    
                    {filters.selectedInsight === 'silos' && insights.silos && (
                      <>
                        <div className="text-center mb-4 p-4 border-2 border-border">
                          <div className="text-3xl font-bold text-warning">{insights.silos.count}</div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase">Siloed Files</div>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {insights.silos.silos.slice(0, 8).map((silo, i) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + i * 0.05 }}
                              className="p-2 border border-border"
                            >
                              <div className="text-xs font-mono truncate">{silo.filename}</div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Owner: {silo.sole_owner} • {silo.total_commits} commits
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}

                    {filters.selectedInsight === 'costs' && insights.hiddenCosts && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="border-2 border-border p-3 text-center">
                            <div className="text-xl font-bold text-success">
                              ${(insights.hiddenCosts.summary.total_tracked_cost / 1000).toFixed(1)}k
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground uppercase">Total Cost</div>
                          </div>
                          <div className="border-2 border-border p-3 text-center">
                            <div className="text-xl font-bold text-success">
                              ${insights.hiddenCosts.summary.avg_cost_per_ticket.toFixed(0)}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground uppercase">Avg/Ticket</div>
                          </div>
                        </div>
                      </>
                    )}

                    {filters.selectedInsight === 'velocity' && insights.velocity && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {insights.velocity.developers.slice(0, 8).map((dev, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.05 }}
                            className="flex items-center justify-between p-2 border border-border"
                          >
                            <span className="text-sm font-mono truncate flex-1">{dev.developer}</span>
                            <span className="text-[10px] font-mono text-accent">
                              {dev.total_points} pts
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
                </>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Selected Node Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute top-4 right-4 w-80 bg-background border-2 border-foreground shadow-xl z-20 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b-2 border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: ACCENT_COLORS[selectedNode.type?.toLowerCase()] || ACCENT_COLORS.default }} 
                  />
                  <h3 className="font-semibold truncate">{selectedNode.name || selectedNode.label}</h3>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBackgroundClick}
                  className="p-1 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Type</span>
                  <p className="capitalize font-mono text-sm">{selectedNode.type}</p>
                </div>
                {selectedNode.email && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Email</span>
                    <p className="font-mono text-sm">{selectedNode.email}</p>
                  </div>
                )}
                {selectedNode.team && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Team</span>
                    <p className="font-mono text-sm">{selectedNode.team}</p>
                  </div>
                )}
                {selectedNode.role && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Role</span>
                    <p className="font-mono text-sm">{selectedNode.role}</p>
                  </div>
                )}
                {selectedNode.status && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</span>
                    <p className={`inline-block px-2 py-0.5 text-xs font-mono ${
                      selectedNode.status === 'Done' ? 'bg-success/20 text-success' :
                      selectedNode.status === 'In Progress' ? 'bg-warning/20 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>{selectedNode.status}</p>
                  </div>
                )}
                
                {/* Clickable Connections Section */}
                <div className="pt-3 border-t border-border">
                  <motion.button
                    onClick={() => setShowRelationships(!showRelationships)}
                    className="w-full flex items-center justify-between group"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Connections</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{connectedNodesList.length}</span>
                      <motion.div
                        animate={{ rotate: showRelationships ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showRelationships && connectedNodesList.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 space-y-1 overflow-hidden"
                      >
                        {connectedNodesList.map((connection, i) => (
                          <motion.button
                            key={`${connection.node.id}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleConnectedNodeClick(connection.node)}
                            className="w-full flex items-center gap-2 p-2 border border-border hover:border-foreground hover:bg-muted/50 transition-all text-left group"
                          >
                            <div 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: ACCENT_COLORS[connection.node.type?.toLowerCase()] || ACCENT_COLORS.default }} 
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs truncate group-hover:text-foreground">
                                {connection.node.name || connection.node.label}
                              </p>
                              <p className="text-[9px] text-muted-foreground font-mono">
                                {connection.direction === 'out' ? '→' : '←'} {connection.linkType.replace('_', ' ')}
                              </p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default KnowledgeGraph3D
