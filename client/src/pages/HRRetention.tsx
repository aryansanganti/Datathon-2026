import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Heart,
  Brain,
  Activity,
  Clock,
  Target,
  RefreshCw,
  ChevronRight,
  Flame,
  Shield,
  Loader2
} from "lucide-react"

const API = "/api"
const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions'

// ============================================
// TYPES
// ============================================

interface RetentionEmployee {
  employee: {
    _id: string
    name: string
    email?: string
    role: string
    team?: string
    department?: string
  }
  metrics: {
    workload_factor: number
    activity_trend: number
    overdue_stress: number
    recent_commits: number
    active_tasks: number
    overdue_tasks: number
    completed_tasks: number
  }
  risk: {
    score: number
    level: 'critical' | 'high' | 'medium' | 'low'
  }
  recommendations: Array<{
    type: string
    message: string
    priority: string
  }>
}

interface RetentionAnalysis {
  summary: {
    total_employees: number
    critical_risk: number
    high_risk: number
    medium_risk: number
    low_risk: number
    avg_risk_score: number
  }
  employees: RetentionEmployee[]
}

interface AIInsight {
  overall_assessment: string
  critical_actions: string[]
  team_recommendations: string[]
  wellness_initiatives: string[]
}

interface HRRetentionProps {
  onBack: () => void
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getApiKey = (): string | null => {
  return localStorage.getItem('featherless_api_key') || 
         import.meta.env.VITE_FEATHERLESS_API_KEY || 
         null
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical': return 'border-destructive'
    case 'high': return 'border-orange-500'
    case 'medium': return 'border-warning'
    case 'low': return 'border-success'
    default: return 'border-border'
  }
}

const getRiskParams = (level: string) => {
    switch (level) {
      case 'critical': return { icon: <Flame className="w-4 h-4 text-destructive" />, color: "text-destructive", ring: "ring-destructive/20" }
      case 'high': return { icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, color: "text-orange-500", ring: "ring-orange-500/20" }
      case 'medium': return { icon: <Activity className="w-4 h-4 text-warning" />, color: "text-warning", ring: "ring-warning/20" }
      case 'low': return { icon: <CheckCircle2 className="w-4 h-4 text-success" />, color: "text-success", ring: "ring-success/20" }
      default: return { icon: <Shield className="w-4 h-4 text-muted-foreground" />, color: "text-muted-foreground", ring: "ring-muted/20" }
    }
}

// ============================================
// COMPONENTS
// ============================================

const RiskSummaryCard = ({ label, value, total, color }: {
  label: string
  value: number
  total: number
  color: string // kept for interface compatibility but unused in new design
}) => {
    const params = getRiskParams(label.toLowerCase());
    return (
    <div className="p-4 border-2 border-border bg-card hover:bg-muted/10 transition-colors">
        <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase text-muted-foreground">{label}</span>
        {params.icon}
        </div>
        <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold font-mono ${params.color}`}>{value}</span>
        <span className="text-sm text-muted-foreground">/ {total}</span>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(value / total) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${params.color.replace('text-', 'bg-')}`}
        />
        </div>
    </div>
    )
}

const EmployeeRiskCard = ({ employee, onClick }: {
  employee: RetentionEmployee
  onClick: () => void
}) => {
  const params = getRiskParams(employee.risk.level);
  return (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -2 }}
    className={`w-full text-left p-4 border transition-all bg-card hover:shadow-md ${getRiskColor(employee.risk.level)}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold ${params.color}`}>
          {employee.employee.name?.charAt(0) || '?'}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{employee.employee.name}</h3>
          <p className="text-xs text-muted-foreground">
            {employee.employee.role}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end gap-1">
          {params.icon}
          <span className={`text-lg font-bold font-mono ${params.color}`}>{employee.risk.score}</span>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{employee.risk.level} Risk</p>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/50">
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">{employee.metrics.workload_factor}%</p>
        <p className="text-[10px] text-muted-foreground">Workload</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">{employee.metrics.activity_trend}%</p>
        <p className="text-[10px] text-muted-foreground">Activity</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">{employee.metrics.active_tasks}</p>
        <p className="text-[10px] text-muted-foreground">Active</p>
      </div>
      <div className="text-center">
        <p className={`text-lg font-bold ${employee.metrics.overdue_tasks > 0 ? 'text-destructive' : 'text-foreground'}`}>
          {employee.metrics.overdue_tasks}
        </p>
        <p className="text-[10px] text-muted-foreground">Overdue</p>
      </div>
    </div>
  </motion.button>
  )
}

const StressGauge = ({ value, size = 120 }: { value: number, size?: number }) => {
  const radius = (size - 20) / 2
  const circumference = radius * Math.PI // Semi-circle
  const offset = circumference - (value / 100) * circumference
  
  const getColor = (v: number) => {
    if (v >= 70) return 'text-destructive'
    if (v >= 50) return 'text-warning'
    return 'text-success'
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
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={getColor(value)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className={`text-3xl font-bold font-mono ${getColor(value)}`}>{value}</span>
        <p className="text-xs text-muted-foreground">Avg Risk Score</p>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HRRetention({ onBack }: HRRetentionProps) {
  const [data, setData] = useState<RetentionAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<RetentionEmployee | null>(null)
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null)
  const [generatingInsight, setGeneratingInsight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  // Fetch retention data
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/hr/retention-analysis`)
      .then(r => r.ok ? r.json() : null)
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load retention data')
        setLoading(false)
      })
  }, [])

  // Generate AI insights
  const generateAIInsight = useCallback(async () => {
    if (!data) return
    
    setGeneratingInsight(true)
    setAiInsight(null)

    // Prepare data for API
    const highRiskEmployees = data.employees
      .filter(e => e.risk.level === 'critical' || e.risk.level === 'high')
      .map(e => ({
        name: e.employee.name,
        role: e.employee.role,
        team: e.employee.team,
        risk_score: e.risk.score,
        workload: e.metrics.workload_factor,
        activity_trend: e.metrics.activity_trend,
        overdue: e.metrics.overdue_tasks,
        active: e.metrics.active_tasks
      }));

    try {
      const response = await fetch(`${API}/hr/generate-retention-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: data.summary,
          employees: [], // Not sending full list to save tokens
          risks: highRiskEmployees
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      setAiInsight(result)
    } catch (err) {
      console.error('LLM Error:', err)
      setError('Failed to generate AI insights')
    } finally {
      setGeneratingInsight(false)
    }
  }, [data])

  const filteredEmployees = data?.employees.filter(e => 
    filter === 'all' || e.risk.level === filter
  ) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={onBack}
                whileHover={{ x: -4 }}
                className="flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-wider hover:opacity-90"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </motion.button>
              <div>
                <h1 className="text-xl font-bold">Employee Retention & Wellness</h1>
                <p className="text-xs text-muted-foreground font-mono">Stress Analysis & Risk Management</p>
              </div>
            </div>
            <motion.button
              onClick={generateAIInsight}
              disabled={generatingInsight}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-mono text-sm disabled:opacity-50"
            >
              {generatingInsight ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  AI Insights
                </>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 border-2 border-destructive bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <RiskSummaryCard 
              label="Critical" 
              value={data.summary.critical_risk} 
              total={data.summary.total_employees}
              color="text-destructive bg-destructive/10 border-destructive"
            />
            <RiskSummaryCard 
              label="High" 
              value={data.summary.high_risk} 
              total={data.summary.total_employees}
              color="text-orange-500 bg-orange-500/10 border-orange-500"
            />
            <RiskSummaryCard 
              label="Medium" 
              value={data.summary.medium_risk} 
              total={data.summary.total_employees}
              color="text-warning bg-warning/10 border-warning"
            />
            <RiskSummaryCard 
              label="Low" 
              value={data.summary.low_risk} 
              total={data.summary.total_employees}
              color="text-success bg-success/10 border-success"
            />
            <div className="col-span-2 md:col-span-1 border-2 border-border p-4 flex flex-col items-center justify-center">
              <StressGauge value={data.summary.avg_risk_score} size={100} />
            </div>
          </div>
        )}

        {/* AI Insights Panel */}
        {aiInsight && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 border-2 border-foreground p-6 bg-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-success" />
              <h2 className="font-bold">AI Retention Analysis</h2>
            </div>
            
            <p className="text-sm mb-4">{aiInsight.overall_assessment}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-xs font-mono uppercase text-destructive mb-2 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Critical Actions
                </h3>
                <ul className="space-y-1">
                  {aiInsight.critical_actions.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase text-warning mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Team Recommendations
                </h3>
                <ul className="space-y-1">
                  {aiInsight.team_recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase text-success mb-2 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Wellness Initiatives
                </h3>
                <ul className="space-y-1">
                  {aiInsight.wellness_initiatives.map((init, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-success" />
                      {init}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-mono uppercase border-2 transition-colors ${
                filter === f 
                  ? 'border-foreground bg-foreground text-background' 
                  : 'border-border hover:border-foreground/50'
              }`}
            >
              {f} {f !== 'all' && data && `(${data.employees.filter(e => e.risk.level === f).length})`}
            </button>
          ))}
        </div>

        {/* Employee List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No employees found</p>
              <p className="text-xs mt-2">Add employee data to MongoDB to see retention analysis</p>
            </div>
          ) : (
            filteredEmployees.map(emp => (
              <EmployeeRiskCard
                key={emp.employee._id}
                employee={emp}
                onClick={() => setSelectedEmployee(emp)}
              />
            ))
          )}
        </div>

        {/* Employee Detail Modal */}
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEmployee(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={e => e.stopPropagation()}
              className={`max-w-lg w-full border-2 p-6 bg-card ${getRiskColor(selectedEmployee.risk.level)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedEmployee.employee.name}</h2>
                  <p className="text-sm opacity-80">{selectedEmployee.employee.role}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold font-mono">{selectedEmployee.risk.score}</div>
                  <p className="text-xs uppercase">{selectedEmployee.risk.level} Risk</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-background/50">
                  <p className="text-xs opacity-70">Workload Factor</p>
                  <p className="text-xl font-bold">{selectedEmployee.metrics.workload_factor}%</p>
                </div>
                <div className="p-3 bg-background/50">
                  <p className="text-xs opacity-70">Activity Trend</p>
                  <p className="text-xl font-bold">{selectedEmployee.metrics.activity_trend}%</p>
                </div>
                <div className="p-3 bg-background/50">
                  <p className="text-xs opacity-70">Overdue Stress</p>
                  <p className="text-xl font-bold">{selectedEmployee.metrics.overdue_stress}%</p>
                </div>
                <div className="p-3 bg-background/50">
                  <p className="text-xs opacity-70">Completed Tasks</p>
                  <p className="text-xl font-bold">{selectedEmployee.metrics.completed_tasks}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase mb-2">Recommendations</h3>
                <ul className="space-y-2">
                  {selectedEmployee.recommendations.map((rec, i) => (
                    <li key={i} className={`p-2 text-sm ${
                      rec.priority === 'high' ? 'bg-destructive/20' :
                      rec.priority === 'medium' ? 'bg-warning/20' : 'bg-muted/50'
                    }`}>
                      <span className="uppercase text-[10px] font-mono opacity-70">{rec.type}</span>
                      <p>{rec.message}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full mt-4 py-2 border-2 border-current font-mono text-sm uppercase hover:bg-current hover:text-background transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
