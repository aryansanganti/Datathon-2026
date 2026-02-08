import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  GitBranch,
  Clock,
  Zap,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Cpu,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Timer,
  Rocket,
  Brain,
  Network,
  Workflow,
  LineChart,
  Layers,
  FileText
} from "lucide-react"

const API = "/api"

// ============================================
// TYPES
// ============================================

interface Health {
  status: string
  db?: string
}

interface Metrics {
  by_source_entity: Record<string, { 
    success_count: number
    fail_count: number
    last_latency_ms: number | null 
  }>
  last_sync: Record<string, { 
    last_sync_at: string | null
    last_cursor: string | null 
  }>
}

interface FinanceOverview {
  summary: {
    total_budgeted_cost: number
    actual_spent_cost: number
    remaining_budget: number
    projected_savings: number
    roi_percentage: number
    avg_hourly_rate: number
  }
  tasks: {
    total: number
    completed: number
    in_progress: number
    pending: number
    completion_rate: number
  }
  hours: {
    total_estimated: number
    completed: number
    remaining: number
  }
}

interface DashboardStats {
  activeUsers: number
  tasksCompleted: number
  totalTasks: number
  inProgress: number
  completionRate: number
  velocity: number
  roi: number
  savings: number
  budgetUtilization: number
}

interface DashboardProps {
  onNavigate: (tab: string) => void
  githubConnected: boolean | null
  onConnectGitHub: () => void
}

// ============================================
// ANIMATED BACKGROUND PARTICLES
// ============================================

const FloatingParticle = ({ delay, duration, size, startX, startY }: {
  delay: number
  duration: number
  size: number
  startX: number
  startY: number
}) => (
  <motion.div
    className="absolute rounded-full bg-foreground/5"
    style={{ width: size, height: size }}
    initial={{ x: startX, y: startY, opacity: 0 }}
    animate={{
      x: [startX, startX + 50, startX - 30, startX],
      y: [startY, startY - 80, startY - 40, startY],
      opacity: [0, 0.6, 0.4, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
)

// ============================================
// LIVE PULSE INDICATOR
// ============================================

const LivePulse = ({ active, size = "md" }: { active: boolean, size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" }
  return (
    <div className="relative flex items-center justify-center">
      <div className={`${sizes[size]} rounded-full ${active ? 'bg-success' : 'bg-destructive'}`} />
      {active && (
        <>
          <motion.div
            className={`absolute ${sizes[size]} rounded-full bg-success`}
            animate={{ scale: [1, 2, 2.5], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className={`absolute ${sizes[size]} rounded-full bg-success`}
            animate={{ scale: [1, 1.8, 2.2], opacity: [0.4, 0.1, 0] }}
            transition={{ duration: 1.5, delay: 0.3, repeat: Infinity }}
          />
        </>
      )}
    </div>
  )
}

// ============================================
// ANIMATED COUNTER
// ============================================

const AnimatedCounter = ({ value, duration = 2 }: { value: number, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      
      setDisplayValue(Math.floor(progress * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span>{displayValue.toLocaleString()}</span>
}

// ============================================
// MINI SPARKLINE CHART
// ============================================

const MiniSparkline = ({ data, color = "currentColor", height = 40 }: { 
  data: number[]
  color?: string
  height?: number 
}) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      {/* Animated dot at the end */}
      <motion.circle
        cx={100}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="4"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </svg>
  )
}

// ============================================
// ANIMATED PROGRESS RING
// ============================================

const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color = "hsl(var(--success))" }: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold font-mono">{progress}%</span>
      </div>
    </div>
  )
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; positive: boolean }
  sparklineData?: number[]
  color?: string
  delay?: number
}

const StatCard = ({ title, value, subtitle, icon, trend, sparklineData, color = "hsl(var(--foreground))", delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="group relative border-2 border-foreground bg-card p-5 overflow-hidden cursor-pointer"
    style={{ boxShadow: 'var(--shadow-md)' }}
  >
    {/* Animated background gradient on hover */}
    <motion.div 
      className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    />
    
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-foreground text-background">
          {icon}
        </div>
        {trend && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.2 }}
            className={`flex items-center gap-1 text-xs font-mono ${
              trend.positive ? 'text-success' : 'text-destructive'
            }`}
          >
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </motion.div>
        )}
      </div>
      
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
      
      {sparklineData && (
        <div className="mt-3 h-10">
          <MiniSparkline data={sparklineData} color={color} />
        </div>
      )}
    </div>
    
    {/* Bottom accent line */}
    <motion.div 
      className="absolute bottom-0 left-0 h-1 bg-foreground"
      initial={{ width: 0 }}
      animate={{ width: '100%' }}
      transition={{ delay: delay + 0.3, duration: 0.5 }}
    />
  </motion.div>
)

// ============================================
// NAVIGATION CARD
// ============================================

interface NavCardProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  gradient: string
  delay?: number
  badge?: string
}

const NavCard = ({ title, description, icon, onClick, gradient, delay = 0, badge }: NavCardProps) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group relative w-full text-left border-2 border-foreground bg-card p-6 overflow-hidden"
    style={{ boxShadow: 'var(--shadow-md)' }}
  >
    {/* Animated gradient background */}
    <motion.div 
      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`}
    />
    
    {/* Shimmer effect */}
    <motion.div
      className="absolute inset-0 opacity-0 group-hover:opacity-30"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      }}
      animate={{
        x: ['-100%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 1,
      }}
    />
    
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <motion.div 
          className="p-3 bg-foreground text-background"
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          {icon}
        </motion.div>
        {badge && (
          <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-foreground text-background">
            {badge}
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-semibold mb-1 group-hover:text-foreground transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      
      <motion.div 
        className="mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors"
        initial={{ x: 0 }}
        whileHover={{ x: 4 }}
      >
        Explore
        <ArrowUpRight className="w-3 h-3" />
      </motion.div>
    </div>
  </motion.button>
)

// ============================================
// LIVE ACTIVITY FEED
// ============================================

const ActivityFeed = ({ metrics }: { metrics: Metrics | null }) => {
  const [activities, setActivities] = useState<Array<{
    id: number
    type: 'sync' | 'success' | 'error' | 'latency'
    message: string
    time: Date
  }>>([])

  useEffect(() => {
    if (!metrics) return
    
    const newActivities: typeof activities = []
    let id = 0
    
    Object.entries(metrics.last_sync).forEach(([key, v]) => {
      if (v.last_sync_at) {
        newActivities.push({
          id: id++,
          type: 'sync',
          message: `${key} synced`,
          time: new Date(v.last_sync_at)
        })
      }
    })
    
    Object.entries(metrics.by_source_entity).forEach(([key, v]) => {
      if (v.success_count > 0) {
        newActivities.push({
          id: id++,
          type: 'success',
          message: `${v.success_count} ${key} operations succeeded`,
          time: new Date()
        })
      }
      if (v.fail_count > 0) {
        newActivities.push({
          id: id++,
          type: 'error',
          message: `${v.fail_count} ${key} operations failed`,
          time: new Date()
        })
      }
    })
    
    setActivities(newActivities.slice(0, 5))
  }, [metrics])

  const getIcon = (type: string) => {
    switch (type) {
      case 'sync': return <Database className="w-3 h-3" />
      case 'success': return <CheckCircle2 className="w-3 h-3 text-success" />
      case 'error': return <AlertCircle className="w-3 h-3 text-destructive" />
      case 'latency': return <Timer className="w-3 h-3 text-warning" />
      default: return <Activity className="w-3 h-3" />
    }
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground text-center py-8"
          >
            No recent activity
          </motion.div>
        ) : (
          activities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-3 border border-border hover:border-foreground transition-colors"
            >
              <div className="p-1.5 bg-muted">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{activity.message}</p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {activity.time.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// SYSTEM STATUS GRID
// ============================================

const SystemStatusGrid = ({ health, githubConnected }: { 
  health: Health | null
  githubConnected: boolean | null 
}) => {
  const systems = [
    { name: 'API Server', status: health?.status === 'ok', icon: <Cloud className="w-4 h-4" /> },
    { name: 'Database', status: health?.db === 'connected', icon: <Database className="w-4 h-4" /> },
    { name: 'GitHub', status: githubConnected === true, icon: <GitBranch className="w-4 h-4" /> },
    { name: 'AI Engine', status: true, icon: <Brain className="w-4 h-4" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {systems.map((system, i) => (
        <motion.div
          key={system.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 p-3 border border-border"
        >
          <div className="p-1.5 bg-muted text-muted-foreground">
            {system.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono truncate">{system.name}</p>
          </div>
          <LivePulse active={system.status} size="sm" />
        </motion.div>
      ))}
    </div>
  )
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function Dashboard({ onNavigate, githubConnected, onConnectGitHub }: DashboardProps) {
  const [health, setHealth] = useState<Health | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [financeData, setFinanceData] = useState<FinanceOverview | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // Real data from MongoDB via API
  const [stats, setStats] = useState<DashboardStats>({
    activeUsers: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    inProgress: 0,
    completionRate: 0,
    velocity: 0,
    roi: 0,
    savings: 0,
    budgetUtilization: 0
  })

  // Historical data for sparklines (from real API)
  const [sparklineData, setSparklineData] = useState({
    tasks: [0],
    efficiency: [0],
    velocity: [0]
  })

  // Fetch health
  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }))
  }, [])

  // Fetch metrics
  useEffect(() => {
    fetch(`${API}/metrics`)
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => setMetrics(null))
  }, [])

  // Fetch real finance data from MongoDB
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/finance/overview`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/finance/daily-progress?days=14`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/hr/employees`).then(r => r.ok ? r.json() : []).catch(() => [])
    ])
      .then(([finance, dailyProgress, employees]) => {
        if (finance) {
          setFinanceData(finance)
          setStats({
            activeUsers: Array.isArray(employees) ? employees.length : 0,
            tasksCompleted: finance.tasks?.completed || 0,
            totalTasks: finance.tasks?.total || 0,
            inProgress: finance.tasks?.in_progress || 0,
            completionRate: finance.tasks?.completion_rate || 0,
            velocity: finance.hours?.completed || 0,
            roi: finance.summary?.roi_percentage || 0,
            savings: finance.summary?.projected_savings || 0,
            budgetUtilization: finance.summary?.total_budgeted_cost > 0 
              ? Math.round((finance.summary?.actual_spent_cost / finance.summary?.total_budgeted_cost) * 100)
              : 0
          })
        }
        
        // Build sparkline data from daily progress
        if (dailyProgress?.daily_breakdown) {
          const days = dailyProgress.daily_breakdown
          setSparklineData({
            tasks: days.map((d: { completed_count: number }) => d.completed_count || 0),
            efficiency: days.map((d: { completed_count: number; total_count: number }) => 
              d.total_count > 0 ? Math.round((d.completed_count / d.total_count) * 100) : 0
            ),
            velocity: days.map((d: { hours_logged: number }) => d.hours_logged || 0)
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Update time every second (just the clock, not stats)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden">
      {/* Floating Particles Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 0.5}
            duration={8 + Math.random() * 4}
            size={4 + Math.random() * 8}
            startX={Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)}
            startY={Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-foreground pb-6"
        >
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-14 h-14 bg-foreground flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Layers className="w-7 h-7 text-background" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Business Intelligence Dashboard
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <motion.p 
                className="text-2xl font-mono font-bold"
                key={currentTime.toLocaleTimeString()}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {currentTime.toLocaleTimeString()}
              </motion.p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-2 border-foreground">
              <LivePulse active={health?.status === 'ok'} />
              <span className="text-xs font-mono uppercase">
                {health?.status === 'ok' ? 'All Systems Operational' : 'System Issues'}
              </span>
            </div>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <section>
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4"
          >
            {loading ? 'Loading Metrics...' : 'Real-Time Metrics'}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Team Members"
              value={stats.activeUsers}
              icon={<Users className="w-5 h-5" />}
              subtitle={`${stats.totalTasks} total tasks`}
              delay={0.1}
            />
            <StatCard
              title="Tasks Completed"
              value={stats.tasksCompleted}
              subtitle={`${stats.completionRate}% completion`}
              icon={<Target className="w-5 h-5" />}
              trend={stats.completionRate > 50 ? { value: stats.completionRate, positive: true } : undefined}
              sparklineData={sparklineData.tasks.length > 1 ? sparklineData.tasks : undefined}
              color="hsl(var(--success))"
              delay={0.2}
            />
            <StatCard
              title="ROI"
              value={`${stats.roi >= 0 ? '+' : ''}${stats.roi}%`}
              subtitle={`$${stats.savings.toLocaleString()} savings`}
              icon={<TrendingUp className="w-5 h-5" />}
              trend={stats.roi > 0 ? { value: Math.round(stats.roi), positive: true } : undefined}
              color={stats.roi >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              delay={0.3}
            />
            <StatCard
              title="Hours Completed"
              value={stats.velocity}
              subtitle={`${stats.budgetUtilization}% budget utilized`}
              icon={<Clock className="w-5 h-5" />}
              sparklineData={sparklineData.velocity.length > 1 ? sparklineData.velocity : undefined}
              color="hsl(var(--warning))"
              delay={0.4}
            />
          </div>
        </section>

        {/* Navigation Cards */}
        <section>
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4"
          >
            Quick Actions
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <NavCard
              title="Knowledge Graph"
              description="Explore codebase relationships in 3D"
              icon={<Network className="w-6 h-6" />}
              onClick={() => onNavigate('graph')}
              gradient="bg-gradient-to-br from-purple-500/10 to-blue-500/10"
              delay={0.5}
              badge="3D"
            />
            <NavCard
              title="Smart Allocate"
              description="AI-powered task allocation"
              icon={<Brain className="w-6 h-6" />}
              onClick={() => onNavigate('smart-allocate')}
              gradient="bg-gradient-to-br from-green-500/10 to-emerald-500/10"
              delay={0.55}
              badge="AI"
            />
            <NavCard
              title="Finance & ROI"
              description="Cost analysis and risk management"
              icon={<BarChart3 className="w-6 h-6" />}
              onClick={() => onNavigate('finance')}
              gradient="bg-gradient-to-br from-amber-500/10 to-yellow-500/10"
              delay={0.6}
              badge="NEW"
            />
            <NavCard
              title="Delay Prediction"
              description="Forecast timeline risks"
              icon={<Clock className="w-6 h-6" />}
              onClick={() => onNavigate('delay-prediction')}
              gradient="bg-gradient-to-br from-orange-500/10 to-red-500/10"
              delay={0.65}
            />
            <NavCard
              title="Meeting Transcript"
              description="Analyze transcripts to create tasks"
              icon={<FileText className="w-6 h-6" />}
              onClick={() => onNavigate('meeting-transcript')}
              gradient="bg-gradient-to-br from-indigo-500/10 to-violet-500/10"
              delay={0.7}
              badge="NEW"
            />
          </div>
        </section>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Status */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="border-2 border-foreground p-5"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                System Status
              </h2>
              <LivePulse active={health?.status === 'ok'} size="sm" />
            </div>
            <SystemStatusGrid health={health} githubConnected={githubConnected} />
            
            {!githubConnected && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={onConnectGitHub}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                <GitBranch className="w-4 h-4" />
                Connect GitHub
              </motion.button>
            )}
          </motion.section>

          {/* Activity Feed */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="border-2 border-foreground p-5"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Recent Activity
            </h2>
            <ActivityFeed metrics={metrics} />
          </motion.section>

          {/* Performance Overview */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="border-2 border-foreground p-5"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Performance (Real Data)
            </h2>
            <div className="flex items-center justify-around py-4">
              <div className="text-center">
                <ProgressRing progress={stats.completionRate} color="hsl(var(--success))" />
                <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase">Completion</p>
              </div>
              <div className="text-center">
                <ProgressRing progress={stats.budgetUtilization} color="hsl(var(--accent))" />
                <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase">Budget Used</p>
              </div>
              <div className="text-center">
                <ProgressRing progress={Math.min(100, stats.roi > 0 ? stats.roi : 0)} color="hsl(var(--warning))" />
                <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase">ROI</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Tasks</span>
                <span className="font-mono font-bold">{stats.totalTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">In Progress</span>
                <span className="font-mono font-bold">{stats.inProgress}</span>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-center pt-8 pb-4 border-t border-border"
        >
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Powered by AI • Built for Teams • Designed for Scale
          </p>
        </motion.footer>
      </div>
    </div>
  )
}

export default Dashboard
