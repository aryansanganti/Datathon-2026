import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  PieChart,
  BarChart3,
  Calendar,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  RefreshCw,
  ArrowLeft,
  Shield,
  Flame,
  Activity,
  Layers
} from "lucide-react"

const API = "/api"

// ============================================
// TYPES
// ============================================

interface FinanceOverview {
  summary: {
    total_budgeted_cost: number
    actual_spent_cost: number
    remaining_budget: number
    market_rate_cost: number
    projected_savings: number
    roi_percentage: number
    avg_hourly_rate: number
    currency: string
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
  allocation_history: Array<{
    _id: string
    sprint_name: string
    created_at: string
    issues_created: number
  }>
}

interface DailyProgress {
  period: string
  daily_breakdown: Array<{
    date: string
    completed: number
    started: number
    delayed: number
    on_track: number
    cost_incurred: number
    hours_logged: number
    cumulative_completed: number
    cumulative_cost: number
    cumulative_hours: number
  }>
  totals: {
    total_completed: number
    total_cost: number
    total_hours: number
    avg_daily_completion: number
  }
}

interface SprintAnalysis {
  sprints: Array<{
    sprint_id: string
    name: string
    state: string
    start_date: string
    end_date: string
    goal: string
    metrics: {
      total_tasks: number
      completed_tasks: number
      delayed_tasks: number
      completion_rate: number
      velocity: number
    }
    financials: {
      planned_cost: number
      actual_cost: number
      delay_cost: number
      total_cost: number
      savings: number
      roi_percentage: number
    }
  }>
  overall: {
    total_planned_cost: number
    total_actual_cost: number
    total_savings: number
    average_roi: number
  }
}

interface RiskAssessment {
  overall_risk_level: string
  total_risk_exposure: number
  risks: Array<{
    type: string
    severity: string
    count: number
    potential_cost_impact: number
    description: string
    recommendation: string
  }>
  summary: {
    high_risks: number
    medium_risks: number
    low_risks: number
  }
}

interface FinanceROIProps {
  onBack?: () => void
}

// ============================================
// ANIMATED COMPONENTS
// ============================================

const AnimatedValue = ({ value, prefix = "", suffix = "", duration = 1.5 }: { 
  value: number
  prefix?: string
  suffix?: string
  duration?: number 
}) => {
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

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>
}

// Mini chart component
const MiniAreaChart = ({ data, color = "#22c55e", height = 60 }: { 
  data: number[]
  color?: string
  height?: number 
}) => {
  if (data.length < 2) return null
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - ((v - min) / range) * (height - 10)
    return `${x},${y}`
  }).join(' ')
  
  const areaPoints = `0,${height} ${points} 100,${height}`

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`area-gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polygon
        fill={`url(#area-gradient-${color.replace('#', '')})`}
        points={areaPoints}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  )
}

// ROI Gauge
const ROIGauge = ({ value, size = 140 }: { value: number, size?: number }) => {
  const radius = (size - 20) / 2
  const circumference = radius * Math.PI // Half circle
  const clampedValue = Math.max(-100, Math.min(200, value))
  const normalizedValue = (clampedValue + 100) / 300 // -100 to 200 range
  const offset = circumference - normalizedValue * circumference
  
  const getColor = () => {
    if (value >= 50) return "hsl(142, 76%, 36%)" // success green
    if (value >= 20) return "hsl(38, 92%, 50%)" // warning yellow
    if (value >= 0) return "hsl(25, 95%, 53%)" // orange
    return "hsl(0, 84%, 60%)" // destructive red
  }

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <motion.path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <span className="text-3xl font-bold font-mono" style={{ color: getColor() }}>
          {value >= 0 ? '+' : ''}{value}%
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">ROI</span>
      </div>
    </div>
  )
}

// Risk Indicator
const RiskIndicator = ({ level }: { level: string }) => {
  const config = {
    high: { color: "bg-destructive", text: "HIGH", icon: <Flame className="w-4 h-4" /> },
    medium: { color: "bg-warning", text: "MEDIUM", icon: <AlertTriangle className="w-4 h-4" /> },
    low: { color: "bg-success", text: "LOW", icon: <Shield className="w-4 h-4" /> }
  }
  const c = config[level as keyof typeof config] || config.medium
  
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 ${c.color} text-white font-mono text-xs uppercase tracking-wider`}
    >
      {c.icon}
      {c.text} RISK
    </motion.div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FinanceROI({ onBack }: FinanceROIProps) {
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null)
  const [sprintAnalysis, setSprintAnalysis] = useState<SprintAnalysis | null>(null)
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'sprints' | 'daily' | 'risks'>('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch all data
  const fetchData = async () => {
    setRefreshing(true)
    try {
      const [overviewRes, dailyRes, sprintRes, riskRes] = await Promise.all([
        fetch(`${API}/finance/overview`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/finance/daily-progress?days=30`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/finance/sprint-analysis`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/finance/risk-assessment`).then(r => r.ok ? r.json() : null)
      ])
      
      setOverview(overviewRes)
      setDailyProgress(dailyRes)
      setSprintAnalysis(sprintRes)
      setRiskAssessment(riskRes)
    } catch (err) {
      console.error("Failed to fetch finance data:", err)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Extract chart data from daily progress
  const chartData = useMemo(() => {
    if (!dailyProgress?.daily_breakdown) return { costs: [], completed: [] }
    return {
      costs: dailyProgress.daily_breakdown.map(d => d.cumulative_cost),
      completed: dailyProgress.daily_breakdown.map(d => d.cumulative_completed)
    }
  }, [dailyProgress])

  if (loading) {
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
            Loading Financial Data...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-foreground">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                <div className="w-12 h-12 bg-foreground flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-background" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Finance & ROI</h1>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Cost Risk Management Dashboard
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {riskAssessment && (
                <RiskIndicator level={riskAssessment.overall_risk_level} />
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchData}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-wider"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 mt-4 -mb-[2px]">
            {[
              { id: 'overview', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
              { id: 'sprints', label: 'Sprint Analysis', icon: <Target className="w-4 h-4" /> },
              { id: 'daily', label: 'Daily Progress', icon: <Calendar className="w-4 h-4" /> },
              { id: 'risks', label: 'Risk Assessment', icon: <AlertTriangle className="w-4 h-4" /> }
            ].map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ y: -1 }}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider border-2 border-b-0 transition-all ${
                  activeTab === tab.id 
                    ? 'border-foreground bg-background -mb-[2px] pb-[calc(0.625rem+2px)]' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && overview && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* ROI Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ROI Gauge Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-1 border-2 border-foreground p-6 flex flex-col items-center justify-center"
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  <ROIGauge value={overview.summary.roi_percentage} size={160} />
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold text-success">
                      <AnimatedValue value={overview.summary.projected_savings} prefix="$" />
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                      Projected Savings vs Market Rate
                    </p>
                  </div>
                </motion.div>

                {/* Key Metrics */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  {[
                    { 
                      label: "Total Budget", 
                      value: overview.summary.total_budgeted_cost, 
                      prefix: "$",
                      icon: <DollarSign className="w-5 h-5" />,
                      color: "text-foreground"
                    },
                    { 
                      label: "Spent to Date", 
                      value: overview.summary.actual_spent_cost, 
                      prefix: "$",
                      icon: <TrendingDown className="w-5 h-5" />,
                      color: "text-warning",
                      subtitle: `${Math.round((overview.summary.actual_spent_cost / overview.summary.total_budgeted_cost) * 100)}% utilized`
                    },
                    { 
                      label: "Remaining", 
                      value: overview.summary.remaining_budget, 
                      prefix: "$",
                      icon: <TrendingUp className="w-5 h-5" />,
                      color: overview.summary.remaining_budget > 0 ? "text-success" : "text-destructive"
                    },
                    { 
                      label: "Avg Hourly Rate", 
                      value: overview.summary.avg_hourly_rate, 
                      prefix: "$",
                      suffix: "/hr",
                      icon: <Users className="w-5 h-5" />,
                      color: "text-foreground"
                    }
                  ].map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="border-2 border-border p-5 hover:border-foreground transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 bg-muted">
                          {metric.icon}
                        </div>
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className={`text-2xl font-bold ${metric.color}`}>
                        <AnimatedValue value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
                      </p>
                      {metric.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Cost Trend Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border-2 border-foreground p-6"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Cost Accumulation</h3>
                    <p className="text-xs text-muted-foreground">Last 30 days cumulative spend</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-success rounded-full" />
                      <span className="text-xs font-mono">Cost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-accent rounded-full" />
                      <span className="text-xs font-mono">Tasks</span>
                    </div>
                  </div>
                </div>
                <div className="h-32">
                  <MiniAreaChart data={chartData.costs} color="#22c55e" height={120} />
                </div>
              </motion.div>

              {/* Task Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Completed", value: overview.tasks.completed, total: overview.tasks.total, color: "bg-success" },
                  { label: "In Progress", value: overview.tasks.in_progress, total: overview.tasks.total, color: "bg-warning" },
                  { label: "Pending", value: overview.tasks.pending, total: overview.tasks.total, color: "bg-muted-foreground" }
                ].map((status, i) => (
                  <motion.div
                    key={status.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="border-2 border-border p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        {status.label}
                      </span>
                      <span className="font-mono font-bold">
                        {status.value}/{status.total}
                      </span>
                    </div>
                    <div className="h-2 bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${status.total > 0 ? (status.value / status.total) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                        className={`h-full ${status.color}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Hours Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="border-2 border-border p-6"
              >
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
                  Hours Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold font-mono">{overview.hours.total_estimated}</p>
                    <p className="text-xs text-muted-foreground">Total Estimated</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold font-mono text-success">{overview.hours.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold font-mono text-warning">{overview.hours.remaining}</p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'sprints' && sprintAnalysis && (
            <motion.div
              key="sprints"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Overall Sprint Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Planned", value: sprintAnalysis.overall.total_planned_cost, prefix: "$" },
                  { label: "Actual Cost", value: sprintAnalysis.overall.total_actual_cost, prefix: "$" },
                  { label: "Total Savings", value: sprintAnalysis.overall.total_savings, prefix: "$", color: "text-success" },
                  { label: "Average ROI", value: sprintAnalysis.overall.average_roi, suffix: "%", color: "text-accent" }
                ].map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="border-2 border-border p-4 text-center"
                  >
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className={`text-2xl font-bold font-mono ${metric.color || ''}`}>
                      {metric.prefix}{metric.value.toLocaleString()}{metric.suffix}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Sprint Cards */}
              <div className="space-y-4">
                {sprintAnalysis.sprints.map((sprint, i) => (
                  <motion.div
                    key={sprint.sprint_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="border-2 border-foreground p-5"
                    style={{ boxShadow: 'var(--shadow-md)' }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{sprint.name}</h3>
                          <span className={`px-2 py-0.5 text-[10px] font-mono uppercase ${
                            sprint.state === 'active' ? 'bg-success text-white' :
                            sprint.state === 'closed' ? 'bg-muted text-muted-foreground' :
                            'bg-warning text-foreground'
                          }`}>
                            {sprint.state}
                          </span>
                        </div>
                        {sprint.goal && (
                          <p className="text-sm text-muted-foreground mt-1">{sprint.goal}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold font-mono ${
                          sprint.financials.roi_percentage >= 20 ? 'text-success' : 
                          sprint.financials.roi_percentage >= 0 ? 'text-warning' : 'text-destructive'
                        }`}>
                          {sprint.financials.roi_percentage >= 0 ? '+' : ''}{sprint.financials.roi_percentage}%
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">ROI</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Tasks</p>
                        <p className="font-mono">
                          <span className="text-success">{sprint.metrics.completed_tasks}</span>
                          <span className="text-muted-foreground">/{sprint.metrics.total_tasks}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Delayed</p>
                        <p className={`font-mono ${sprint.metrics.delayed_tasks > 0 ? 'text-destructive' : 'text-success'}`}>
                          {sprint.metrics.delayed_tasks}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Planned Cost</p>
                        <p className="font-mono">${sprint.financials.planned_cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Actual Cost</p>
                        <p className={`font-mono ${
                          sprint.financials.total_cost > sprint.financials.planned_cost ? 'text-destructive' : 'text-success'
                        }`}>
                          ${sprint.financials.total_cost.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="h-2 bg-muted overflow-hidden flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sprint.metrics.completion_rate}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                          className="bg-success"
                        />
                        {sprint.metrics.delayed_tasks > 0 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(sprint.metrics.delayed_tasks / sprint.metrics.total_tasks) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                            className="bg-destructive"
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'daily' && dailyProgress && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Tasks Completed", value: dailyProgress.totals.total_completed, icon: <CheckCircle2 className="w-5 h-5" /> },
                  { label: "Total Cost", value: dailyProgress.totals.total_cost, prefix: "$", icon: <DollarSign className="w-5 h-5" /> },
                  { label: "Hours Logged", value: dailyProgress.totals.total_hours, icon: <Clock className="w-5 h-5" /> },
                  { label: "Avg Daily", value: dailyProgress.totals.avg_daily_completion, icon: <Activity className="w-5 h-5" /> }
                ].map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="border-2 border-border p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-muted">{metric.icon}</div>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-xl font-bold font-mono">
                      {metric.prefix}{metric.value.toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Daily Breakdown Table */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-2 border-foreground overflow-hidden"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                <div className="p-4 border-b-2 border-border">
                  <h3 className="font-semibold">Daily Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Last {dailyProgress.period}</p>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest">Date</th>
                        <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest">Completed</th>
                        <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest">Started</th>
                        <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest">Delayed</th>
                        <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest">Hours</th>
                        <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyProgress.daily_breakdown.slice().reverse().map((day, i) => (
                        <motion.tr
                          key={day.date}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + i * 0.02 }}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-sm">{day.date}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono ${day.completed > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                              {day.completed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{day.started}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono ${day.delayed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {day.delayed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{day.hours_logged}h</td>
                          <td className="px-4 py-3 text-right font-mono">${day.cumulative_cost.toLocaleString()}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'risks' && riskAssessment && (
            <motion.div
              key="risks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Risk Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="md:col-span-1 border-2 border-foreground p-6 flex flex-col items-center justify-center"
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  <RiskIndicator level={riskAssessment.overall_risk_level} />
                  <p className="text-3xl font-bold font-mono text-destructive mt-4">
                    ${riskAssessment.total_risk_exposure.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                    Total Risk Exposure
                  </p>
                </motion.div>

                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                  {[
                    { label: "High Risk", value: riskAssessment.summary.high_risks, color: "text-destructive", bg: "bg-destructive/10" },
                    { label: "Medium Risk", value: riskAssessment.summary.medium_risks, color: "text-warning", bg: "bg-warning/10" },
                    { label: "Low Risk", value: riskAssessment.summary.low_risks, color: "text-success", bg: "bg-success/10" }
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className={`border-2 border-border p-4 text-center ${item.bg}`}
                    >
                      <p className={`text-4xl font-bold font-mono ${item.color}`}>{item.value}</p>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                        {item.label}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Risk Cards */}
              <div className="space-y-4">
                {riskAssessment.risks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-2 border-border p-8 text-center"
                  >
                    <Shield className="w-12 h-12 text-success mx-auto mb-4" />
                    <p className="font-semibold text-success">No Active Risks Detected</p>
                    <p className="text-sm text-muted-foreground mt-1">Your project is currently on track</p>
                  </motion.div>
                ) : (
                  riskAssessment.risks.map((risk, i) => (
                    <motion.div
                      key={risk.type}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className={`border-2 p-5 ${
                        risk.severity === 'high' ? 'border-destructive' :
                        risk.severity === 'medium' ? 'border-warning' :
                        'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${
                            risk.severity === 'high' ? 'bg-destructive/20 text-destructive' :
                            risk.severity === 'medium' ? 'bg-warning/20 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold capitalize">{risk.type.replace('_', ' ')}</h3>
                            <span className={`text-[10px] font-mono uppercase ${
                              risk.severity === 'high' ? 'text-destructive' :
                              risk.severity === 'medium' ? 'text-warning' :
                              'text-muted-foreground'
                            }`}>
                              {risk.severity} severity • {risk.count} items
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold font-mono text-destructive">
                            ${risk.potential_cost_impact.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Impact</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>
                      
                      <div className="flex items-start gap-2 p-3 bg-muted/50">
                        <Zap className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <p className="text-sm">{risk.recommendation}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default FinanceROI
