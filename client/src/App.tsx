import { useEffect, useState } from "react"
import { MemoryRouter } from "react-router-dom"
import KnowledgeGraph3D from "@/components/KnowledgeGraph3D"
import { Dashboard } from "@/components/Dashboard"
import { RoleManagement } from "@/components/RoleManagement"
import SmartAllocate from "@/pages/SmartAllocate"
import DelayPrediction from "@/pages/DelayPrediction"
import FinanceROI from "@/pages/FinanceROI"
import HRPerformance from "@/pages/HRPerformance"
import HRRetention from "@/pages/HRRetention"
import AllocationSimulation from "@/pages/AllocationSimulation"
import MeetingTranscript from "@/pages/MeetingTranscript"
import { VoiceChatbot } from "@/components/VoiceChatbot/VoiceChatbot"
import { motion } from "framer-motion"
import { ArrowLeft, Briefcase, Users, BarChart3, Brain, Heart, Activity, Database, CheckCircle, XCircle } from "lucide-react"

const API = "/api"

// --- Interfaces ---

interface AllocationData {
  tasks: {
    id: string;
    title: string;
    description: string;
    required_skills: string[];
    estimated_hours: number;
    assigned_employee_ids: string[];
    status: string;
  }[];
  employees: {
    id: string;
    name: string;
    role: string;
    tech_stack: string[];
    hourly_rate: number;
    workload: number;
  }[];
  deadline_weeks: number;
  budget: number;
  total_hours: number;
}

type Health = { status: string; db?: string }
type Metrics = {
  by_source_entity: Record<string, { success_count: number; fail_count: number; last_latency_ms: number | null }>
  last_sync: Record<string, { last_sync_at: string | null; last_cursor: string | null }>
}

type UserRole = 'pm' | 'hr'
// Extended PMTab to include new features from the second code
type PMTab = 'dashboard' | 'graph' | 'smart-allocate' | 'delay-prediction' | 'finance' | 'roles' | 'allocation-simulation' | 'meeting-transcript'
type HRTab = 'hr-home' | 'hr-performance' | 'hr-retention'
type Tab = PMTab | HRTab

function App() {
  // --- State Merged ---
  const [health, setHealth] = useState<Health | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)

  const [userRole, setUserRole] = useState<UserRole>('pm')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [allocationData, setAllocationData] = useState<AllocationData | null>(null)
  
  // For prefilling Smart Allocate from Meeting Transcript
  const [prefillFeature, setPrefillFeature] = useState<{
    feature: string;
    description: string;
    techStack: string[];
  } | null>(null)

  // --- Effects Merged ---

  // Health Check
  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }))
  }, [])

  // Metrics Check
  useEffect(() => {
    fetch(`${API}/metrics`)
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => setMetrics(null))
  }, [])

  // GitHub Auth Status
  useEffect(() => {
    fetch(`${API}/oauth/github/status`)
      .then((r) => r.json())
      .then((d) => setGithubConnected(d.connected))
      .catch(() => setGithubConnected(false))
  }, [])

  // OAuth Callback Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get("oauth")
    if (oauth === "success") setOauthMessage("GitHub connected successfully.")
    if (oauth === "error") setOauthMessage("GitHub connection failed.")
  }, [])

  const connectGitHub = () => {
    window.location.href = `${API}/oauth/github`
  }

  // Role switcher
  const handleRoleSwitch = (role: UserRole) => {
    setUserRole(role)
    setActiveTab(role === 'pm' ? 'dashboard' : 'hr-home')
  }

  // --- Full-screen / Overlay Views ---

  if (activeTab === 'graph') {
    return (
      <div className="fixed inset-0 z-50">
        <KnowledgeGraph3D onBack={() => setActiveTab('dashboard')} />
      </div>
    )
  }

  if (activeTab === 'finance') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-background">
        <FinanceROI onBack={() => setActiveTab('dashboard')} />
      </div>
    )
  }

  // Added Allocation Simulation as a full screen view (consistent with graph/finance)
  if (activeTab === 'allocation-simulation') {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-background">
        <AllocationSimulation
          allocationData={allocationData}
          onBack={() => setActiveTab('smart-allocate')}
          onContinueToDelay={() => setActiveTab('delay-prediction')}
        />
      </div>
    )
  }

  if (activeTab === 'hr-performance') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto">
        <HRPerformance onBack={() => setActiveTab('hr-home')} />
      </div>
    )
  }

  if (activeTab === 'hr-retention') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto">
        <HRRetention onBack={() => setActiveTab('hr-home')} />
      </div>
    )
  }

  if (activeTab === 'meeting-transcript') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-background">
        <MeetingTranscript 
          onBack={() => setActiveTab('dashboard')}
          onNavigateToSmartAllocate={(feature) => {
            setPrefillFeature(feature);
            setActiveTab('smart-allocate');
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Role Switcher Header - Preserved from Code 1 */}
      <div className="sticky top-0 z-40 border-b-2 border-foreground bg-card">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">View As:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleRoleSwitch('pm')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-mono uppercase border-2 transition-colors ${userRole === 'pm'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-foreground'
                  }`}
              >
                <Briefcase className="w-4 h-4" />
                Project Manager
              </button>
              <button
                onClick={() => handleRoleSwitch('hr')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-mono uppercase border-2 transition-colors ${userRole === 'hr'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-foreground'
                  }`}
              >
                <Users className="w-4 h-4" />
                Human Resources
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Health Indicator Small */}
            {health && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-muted-foreground">SYS: {health.status.toUpperCase()}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground font-mono">
              Command Center v2.0
            </div>
          </div>
        </div>
      </div>

      {/* OAuth Notification */}
      {oauthMessage && (
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="bg-primary/10 border border-primary text-primary px-4 py-2 rounded text-sm font-mono flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {oauthMessage}
          </div>
        </div>
      )}

      {/* PM Views */}
      {userRole === 'pm' && activeTab === 'dashboard' && (
        <>
          {/* Health & Metrics Widget - Integrated cleanly above Dashboard */}
          {health && metrics && (
            <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Simplified Metrics Display */}
              {Object.entries(metrics.by_source_entity).slice(0, 3).map(([key, val]) => (
                <div key={key} className="border border-border bg-card p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono uppercase text-muted-foreground">{key}</span>
                    {val.last_latency_ms && <span className="text-[10px] text-muted-foreground">{val.last_latency_ms}ms</span>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {val.success_count}</span>
                    <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> {val.fail_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dashboard
            onNavigate={(tab) => setActiveTab(tab as Tab)}
            githubConnected={githubConnected}
            onConnectGitHub={connectGitHub}
          />
        </>
      )}

      {/* Added Role Management View */}
      {userRole === 'pm' && activeTab === 'roles' && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <ButtonBack onClick={() => setActiveTab('dashboard')} />
          <RoleManagement />
        </div>
      )}

      {userRole === 'pm' && activeTab === 'smart-allocate' && (
        <div className="w-full">
          <MemoryRouter>
            <SmartAllocate
              onBack={() => setActiveTab('dashboard')}
              onNavigateToDelay={(data) => {
                setAllocationData(data);
                // Updated flow: Go to Simulation first, then Delay
                setActiveTab('allocation-simulation');
              }}
            />
          </MemoryRouter>
        </div>
      )}

      {userRole === 'pm' && activeTab === 'delay-prediction' && (
        <div className="w-full">
          <MemoryRouter initialEntries={[{ pathname: '/delay-prediction', state: { allocation: allocationData } }]}>
            <DelayPrediction
              // Updated back navigation
              onBack={() => setActiveTab('allocation-simulation')}
              allocationDataProp={allocationData}
            />
          </MemoryRouter>
        </div>
      )}

      {/* HR Views */}
      {userRole === 'hr' && activeTab === 'hr-home' && (
        <HRDashboard onNavigate={setActiveTab} />
      )}

      {/* Voice Chatbot Widget - Available on all views */}
      <VoiceChatbot />
    </div>
  )
}

// Helper Component for internal navigation
function ButtonBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono uppercase"
    >
      <ArrowLeft className="w-4 h-4" /> Back to Dashboard
    </button>
  )
}

// HR Dashboard Component (Preserved from Code 1)
function HRDashboard({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">HR Command Center</h1>
        <p className="text-muted-foreground">
          AI-powered employee analytics, performance management, and retention tracking
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employee Performance Card */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onNavigate('hr-performance')}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group relative text-left p-8 border-2 border-foreground bg-gradient-to-br from-emerald-500/10 to-green-600/10 overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-foreground text-background">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-success/20 text-success">
                  AI-Powered
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Employee Performance</h2>
            <p className="text-muted-foreground mb-4">
              AI-generated performance reports, appraisal metrics, and promotion readiness assessments based on real MongoDB data
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 text-xs bg-muted">Commits Analysis</span>
              <span className="px-2 py-1 text-xs bg-muted">Task Completion</span>
              <span className="px-2 py-1 text-xs bg-muted">Budget Impact</span>
              <span className="px-2 py-1 text-xs bg-muted">ROI Assessment</span>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono uppercase text-foreground group-hover:translate-x-2 transition-transform">
              View Performance Dashboard
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </div>
        </motion.button>

        {/* Employee Retention Card */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigate('hr-retention')}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group relative text-left p-8 border-2 border-foreground bg-gradient-to-br from-rose-500/10 to-pink-600/10 overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-foreground text-background">
                <Heart className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-warning/20 text-warning">
                  Risk Analysis
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Employee Retention</h2>
            <p className="text-muted-foreground mb-4">
              Track employee stress levels, workload factors, and retention risks with AI-driven wellness recommendations
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 text-xs bg-muted">Stress Tracking</span>
              <span className="px-2 py-1 text-xs bg-muted">Workload Analysis</span>
              <span className="px-2 py-1 text-xs bg-muted">Risk Scores</span>
              <span className="px-2 py-1 text-xs bg-muted">Wellness Actions</span>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono uppercase text-foreground group-hover:translate-x-2 transition-transform">
              View Retention Dashboard
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 p-6 border-2 border-dashed border-border"
      >
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Data Sources
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          All metrics are calculated from real MongoDB data including:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-muted/50">
            <div className="text-2xl font-bold font-mono">Users</div>
            <p className="text-xs text-muted-foreground">Employee profiles & skills</p>
          </div>
          <div className="p-3 bg-muted/50">
            <div className="text-2xl font-bold font-mono">Commits</div>
            <p className="text-xs text-muted-foreground">Code contributions</p>
          </div>
          <div className="p-3 bg-muted/50">
            <div className="text-2xl font-bold font-mono">Tasks</div>
            <p className="text-xs text-muted-foreground">Work assignments</p>
          </div>
          <div className="p-3 bg-muted/50">
            <div className="text-2xl font-bold font-mono">Issues</div>
            <p className="text-xs text-muted-foreground">Jira/ticket data</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default App