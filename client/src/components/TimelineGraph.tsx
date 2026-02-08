import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import EmployeeCard from "./EmployeeCard";
import type { Employee } from "./EmployeeCard";
import { useEffect, useState } from "react";
import { getAllocationFromLLM, syntheticEmployees, getEmployees } from "@/lib/llm-service";
import type { EmployeeData, LLMAllocationResponse } from "@/lib/types";

// Convert EmployeeData to the format used by EmployeeCard
const convertToEmployee = (emp: EmployeeData): Employee => ({
  id: emp.id,
  name: emp.name,
  role: emp.role,
  avatar: emp.avatar,
  techStack: emp.tech_stack,
  workload: Math.round(emp.workload.computed_score * 100),
  hourlyRate: emp.cost_per_hour,
  experience: emp.experience
});

interface TaskSlot {
  id: string;
  title: string;
  requiredSkills: string[];
  estimatedHours: number;
  assignedEmployee?: Employee;
  assignedEmployees?: Employee[]; // Support multiple employees
  candidates: Employee[];
  status: "pending" | "analyzing" | "assigned" | "unassigned";
}

type Priority = "low" | "medium" | "high";

interface FeatureData {
  feature: string;
  details: string;
  budget: number | null;
  techStack: string[];
  deadlineWeeks: number;
  autoGenerateTech: boolean;
  priority: Priority;
}

// Allocation data for delay prediction
interface AllocationData {
  tasks: {
    id: string;
    title: string;
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

interface TimelineGraphProps {
  isProcessing: boolean;
  onAllocationComplete: (allocations: { task: TaskSlot; employee: Employee; employees?: Employee[] }[], llmResponse?: LLMAllocationResponse) => void;
  featureData: FeatureData | null;
  onNavigateToDelay?: (data: AllocationData) => void;
}

// Initial empty tasks - will be populated by LLM
const initialTasks: TaskSlot[] = [];

const TimelineGraph = ({ isProcessing, onAllocationComplete, featureData, onNavigateToDelay }: TimelineGraphProps) => {
  const navigate = useNavigate();
  const [employees, setEmployeesState] = useState<Employee[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [tasks, setTasks] = useState<TaskSlot[]>(initialTasks);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1);
  const [candidateStates, setCandidateStates] = useState<Record<string, "analyzing" | "rejected" | "matched" | "idle" | "grayed">>({});
  const [connections, setConnections] = useState<{ from: string; to: string; status: "active" | "rejected" | "matched" }[]>([]);
  const [thinkingMessages, setThinkingMessages] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [llmStatus, setLlmStatus] = useState<string>('');
  const [allocationComplete, setAllocationComplete] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<{ message: string; suggestion: string } | null>(null);

  // Load employees on mount (from MongoDB or mock data)
  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoadingEmployees(true);
      try {
        const data = await getEmployees();
        setEmployeeData(data);
        setEmployeesState(data.map(convertToEmployee));
        console.log('✅ Loaded', data.length, 'employees');
      } catch (error) {
        console.error('Failed to load employees:', error);
        // Fallback to mock data
        setEmployeeData(syntheticEmployees);
        setEmployeesState(syntheticEmployees.map(convertToEmployee));
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    if (!isProcessing) {
      // Only reset if we haven't completed an allocation (i.e., a new session is starting)
      // Don't reset if allocation is complete - keep results on screen
      if (!allocationComplete) {
        setCurrentTaskIndex(-1);
        setCandidateStates({});
        setConnections([]);
        setTasks(initialTasks);
        setThinkingMessages({});
        setLlmStatus('');
      }
      return;
    }
    
    // If starting a new allocation, reset everything
    setAllocationComplete(false);
    setCurrentTaskIndex(-1);
    setCandidateStates({});
    setConnections([]);
    setTasks(initialTasks);
    setThinkingMessages({});
    setTaskError(null); // Clear any previous error

    if (!featureData) return;
    if (employees.length === 0) {
      setLlmStatus('Loading employees...');
      return;
    }

    // Start allocation process with LLM
    const runAllocation = async () => {
      const allocations: { task: TaskSlot; employee: Employee; employees?: Employee[] }[] = [];
      
      setLlmStatus('Connecting to AI model...');
      
      // Get allocation from LLM
      let llmResponse: LLMAllocationResponse;
      try {
        setLlmStatus(featureData.autoGenerateTech 
          ? 'AI auto-generating tech stack and analyzing requirements...' 
          : 'AI analyzing feature requirements...');
        llmResponse = await getAllocationFromLLM(
          featureData.feature,
          featureData.details,
          featureData.budget,
          featureData.techStack,
          featureData.deadlineWeeks,
          featureData.autoGenerateTech,
          featureData.priority,
          employeeData // Pass the loaded employees
        );
        
        // Check if LLM returned an error (junk/invalid task)
        if (llmResponse.error) {
          setLlmStatus('');
          setTaskError({
            message: llmResponse.error.message,
            suggestion: llmResponse.error.suggestion || 'Try describing a real software feature or task.'
          });
          onAllocationComplete?.([]); // Pass empty allocations for error case
          return;
        }
        
        setLlmStatus('AI allocation complete. Visualizing...');
      } catch (error) {
        console.error('LLM Error:', error);
        setLlmStatus('Using fallback allocation...');
        llmResponse = await getAllocationFromLLM(
          featureData.feature, 
          featureData.details,
          featureData.budget,
          featureData.techStack,
          featureData.deadlineWeeks,
          featureData.autoGenerateTech,
          featureData.priority,
          employeeData // Pass the loaded employees
        );
      }

      // Convert LLM tasks to TaskSlots
      const llmTasks: TaskSlot[] = llmResponse.tasks.map(t => ({
        id: t.id,
        title: t.title,
        requiredSkills: t.required_skills,
        estimatedHours: t.estimated_hours,
        candidates: [],
        status: "pending" as const
      }));

      setTasks(llmTasks);

      // Get ALL employees that the LLM considered across ALL tasks (in allocations or rejections)
      // ONLY these employees should be shown as active - everyone else gets grayed out
      const llmConsideredEmployeeIds = new Set<string>();
      
      // Add all allocated employees
      llmResponse.allocations.forEach(a => {
        if (a.employee_id) llmConsideredEmployeeIds.add(a.employee_id);
        if (a.employee_ids) a.employee_ids.forEach(id => llmConsideredEmployeeIds.add(id));
      });
      
      // Add all rejected employees (LLM considered them but didn't pick them)
      llmResponse.rejections.forEach(r => {
        if (r.employee_id) llmConsideredEmployeeIds.add(r.employee_id);
      });
      
      console.log('🎯 LLM considered employees:', Array.from(llmConsideredEmployeeIds));
      console.log('👥 Total employees:', employees.length);

      // Gray out ALL employees that the LLM did NOT mention
      // This is the ONLY logic for graying - no domain guessing
      const relevantEmployeeIds = new Set<string>();
      employees.forEach(emp => {
        if (llmConsideredEmployeeIds.has(emp.id)) {
          relevantEmployeeIds.add(emp.id);
          console.log(`✅ ${emp.name} is RELEVANT (mentioned by LLM)`);
        } else {
          setCandidateStates(prev => ({ ...prev, [emp.id]: "grayed" }));
          console.log(`⬜ ${emp.name} is GRAYED (not mentioned by LLM)`);
        }
      });

      // Process each task with animations
      for (let i = 0; i < llmTasks.length; i++) {
        setCurrentTaskIndex(i);
        const task = llmTasks[i];
        
        // Clear thinking/rejection for new task, but keep grayed states
        setThinkingMessages({});
        setRejectionReasons({});
        
        // Reset relevant employees to idle for this task
        relevantEmployeeIds.forEach(id => {
          setCandidateStates(prev => ({ ...prev, [id]: "idle" }));
        });
        
        // Find the allocation for this task
        const taskAllocation = llmResponse.allocations.find(a => a.task_id === task.id);
        const taskRejections = llmResponse.rejections.filter(r => r.task_id === task.id);
        
        // Get assigned employee IDs
        const assignedEmployeeIds = taskAllocation?.employee_ids || 
          (taskAllocation?.employee_id ? [taskAllocation.employee_id] : []);
        
        console.log(`Task "${task.title}" - Assigned: ${assignedEmployeeIds.join(', ')}, Rejected: ${taskRejections.map(r => r.employee_id).join(', ')}`);
        
        // ONLY include employees that the LLM specifically mentioned for this task
        // (either assigned or rejected) - NO domain guessing
        const taskRelevantCandidates = employees.filter(emp => {
          // Include if assigned by LLM
          if (assignedEmployeeIds.includes(emp.id)) return true;
          // Include if rejected by LLM for this specific task
          if (taskRejections.some(r => r.employee_id === emp.id)) return true;
          // Don't include anyone else - trust the LLM's selection
          return false;
        });
        
        // Sort candidates by their original grid position (left-to-right, top-to-bottom)
        const sortedCandidates = taskRelevantCandidates.sort((a, b) => {
          const idxA = employees.findIndex(e => e.id === a.id);
          const idxB = employees.findIndex(e => e.id === b.id);
          return idxA - idxB;
        });
        
        // Track analyzed employees to prevent duplicates
        const analyzedInThisTask = new Set<string>();
        
        // Update task status
        setTasks(prev => prev.map((t, idx) => 
          idx === i ? { ...t, candidates: sortedCandidates, status: "analyzing" as const } : t
        ));

        // Analyze ONLY relevant employees for this task (in grid order, no repeats)
        for (const candidate of sortedCandidates) {
          // Skip if already analyzed in this task
          if (analyzedInThisTask.has(candidate.id)) continue;
          analyzedInThisTask.add(candidate.id);
          
          const rejection = taskRejections.find(r => r.employee_id === candidate.id);
          const isAssigned = assignedEmployeeIds.includes(candidate.id);
          
          // Get original employee data for richer info
          const empData = employeeData.find(e => e.id === candidate.id);
          
          // Generate SHORT thinking text based on what we're evaluating
          let thinkingText = '';
          if (isAssigned) {
            const expYears = empData?.experience || 5;
            const topSkills = candidate.techStack.slice(0, 2).join(', ');
            thinkingText = `${expYears}yr exp | ${topSkills}`;
          } else {
            thinkingText = `Evaluating fit...`;
          }
          
          // Set analyzing state
          setThinkingMessages(prev => ({ ...prev, [candidate.id]: thinkingText }));
          setCandidateStates(prev => ({ ...prev, [candidate.id]: "analyzing" }));
          setConnections(prev => [...prev, { from: candidate.id, to: task.id, status: "active" }]);
          
          await new Promise(r => setTimeout(r, 500));
          
          // Determine final state
          if (isAssigned) {
            // Match reason focused on skills/experience, not availability
            const expYears = empData?.experience || 5;
            const topSkill = candidate.techStack[0] || 'Expert';
            const expLevel = expYears >= 8 ? 'Senior' : expYears >= 4 ? 'Mid-level' : 'Junior';
            const matchReason = `${expLevel} ${topSkill} specialist`;
            setThinkingMessages(prev => ({ ...prev, [candidate.id]: matchReason }));
            setCandidateStates(prev => ({ ...prev, [candidate.id]: "matched" }));
            setConnections(prev => prev.map(c => 
              c.from === candidate.id && c.to === task.id ? { ...c, status: "matched" } : c
            ));
          } else {
            // Generate SHORT 2-3 word rejection reason based on LLM feedback
            let shortReason = 'Not selected';
            if (rejection) {
              const reason = rejection.rejection_reason.toLowerCase();
              // Map common rejection reasons to SHORT 2-3 word phrases
              if (reason.includes('workload') || reason.includes('capacity') || reason.includes('busy') || reason.includes('overload')) {
                shortReason = 'Too busy';
              } else if (reason.includes('skill') && (reason.includes('lack') || reason.includes('missing') || reason.includes("doesn't have") || reason.includes('no '))) {
                shortReason = 'Missing skills';
              } else if (reason.includes('skill') || reason.includes('expertise') || reason.includes('stack') || reason.includes('technology')) {
                shortReason = 'Skill mismatch';
              } else if (reason.includes('experience') && (reason.includes('lack') || reason.includes('insufficient') || reason.includes('limited'))) {
                shortReason = 'Less experience';
              } else if (reason.includes('senior') || reason.includes('junior') || reason.includes('experience')) {
                shortReason = 'Seniority mismatch';
              } else if (reason.includes('budget') || reason.includes('cost') || reason.includes('expensive') || reason.includes('rate')) {
                shortReason = 'Over budget';
              } else if (reason.includes('stress') || reason.includes('burnout')) {
                shortReason = 'High stress';
              } else if (reason.includes('unavailable') || reason.includes('not available') || reason.includes('availability')) {
                shortReason = 'Unavailable';
              } else if (reason.includes('deadline') || reason.includes('timeline') || reason.includes('schedule')) {
                shortReason = 'Schedule conflict';
              } else if (reason.includes('domain') || reason.includes('specializ')) {
                shortReason = 'Wrong domain';
              } else if (reason.includes('assigned') || reason.includes('already')) {
                shortReason = 'Already assigned';
              } else if (reason.includes('efficient') || reason.includes('better fit') || reason.includes('more suitable')) {
                shortReason = 'Better options';
              } else {
                shortReason = 'Not optimal';
              }
            }
            setRejectionReasons(prev => ({ ...prev, [candidate.id]: shortReason }));
            setCandidateStates(prev => ({ ...prev, [candidate.id]: "rejected" }));
            setConnections(prev => prev.map(c => 
              c.from === candidate.id && c.to === task.id ? { ...c, status: "rejected" } : c
            ));
          }
          
          await new Promise(r => setTimeout(r, 150));
        }

        // Update task status
        if (taskAllocation && assignedEmployeeIds.length > 0) {
          const matchedEmployees = assignedEmployeeIds
            .map(id => employees.find(e => e.id === id))
            .filter((e): e is Employee => e !== undefined);
          
          const firstEmployee = matchedEmployees[0];
          setTasks(prev => prev.map((t, idx) => 
            idx === i ? { 
              ...t, 
              assignedEmployee: firstEmployee, 
              assignedEmployees: matchedEmployees,
              status: "assigned" as const 
            } : t
          ));
          
          allocations.push({ 
            task: { ...task, assignedEmployee: firstEmployee, assignedEmployees: matchedEmployees }, 
            employee: firstEmployee,
            employees: matchedEmployees
          });
        } else {
          setTasks(prev => prev.map((t, idx) => 
            idx === i ? { ...t, status: "unassigned" as const } : t
          ));
        }

        await new Promise(r => setTimeout(r, 400));
      }

      setLlmStatus('Allocation complete!');
      setAllocationComplete(true);
      onAllocationComplete(allocations, llmResponse);
    };

    runAllocation();
  }, [isProcessing, onAllocationComplete, featureData, employees, employeeData]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Resource Allocation Timeline</h2>
        <div className="flex items-center gap-4">
          {isLoadingEmployees && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
              <span className="text-xs font-mono">Loading employees...</span>
            </motion.div>
          )}
          {!isLoadingEmployees && employees.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground">
              {employees.length} employees loaded
            </span>
          )}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-accent"
            >
              <div className="relative">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-accent rounded-full animate-pulse-ring" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest">AI Processing</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Graph Container */}
      <div className="relative border-2 border-foreground bg-card p-6 min-h-[600px]">
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Main Feature Name - Centered at Top */}
        {featureData && (isProcessing || tasks.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block px-8 py-4 bg-foreground text-background border-2 border-foreground"
            >
              <span className="text-xs font-mono uppercase tracking-widest opacity-70 block mb-1">
                Feature Request
              </span>
              <h3 className="text-xl font-bold font-mono">{featureData.feature}</h3>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs opacity-70">
                {featureData.budget !== null && (
                  <>
                    <span>Budget: ${featureData.budget.toLocaleString()}</span>
                    <span>•</span>
                  </>
                )}
                <span>Deadline: {featureData.deadlineWeeks} weeks</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        <div className="relative z-10 grid grid-cols-12 gap-6">
          {/* Tasks Column */}
          <div className="col-span-4 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Task Breakdown
            </h3>
            <AnimatePresence>
              {/* Show error state if task is invalid */}
              {taskError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 border-2 border-destructive bg-destructive/5 relative"
                  style={{ boxShadow: "0 0 30px hsl(var(--destructive) / 0.2)" }}
                >
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-destructive flex items-center justify-center rounded-full">
                    <span className="text-destructive-foreground text-lg">!</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-destructive text-2xl">⚠️</div>
                    <div>
                      <h4 className="font-semibold text-destructive mb-2">Invalid Task Request</h4>
                      <p className="text-sm text-muted-foreground mb-3">{taskError.message}</p>
                      <div className="p-3 bg-muted/50 border border-border">
                        <p className="text-xs font-mono text-muted-foreground">
                          💡 <span className="text-foreground">{taskError.suggestion}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {!taskError && tasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    borderColor: task.status === "assigned" 
                      ? "hsl(var(--success))" 
                      : task.status === "unassigned"
                        ? "hsl(var(--destructive))"
                        : task.status === "analyzing" 
                          ? "hsl(var(--accent))" 
                          : "hsl(var(--border))"
                  }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 border-2 bg-background relative"
                  style={{
                    boxShadow: task.status === "analyzing" 
                      ? "0 0 20px hsl(var(--accent) / 0.2)" 
                      : task.status === "assigned"
                        ? "0 0 20px hsl(var(--success) / 0.2)"
                        : task.status === "unassigned"
                          ? "0 0 20px hsl(var(--destructive) / 0.2)"
                          : "none"
                  }}
                >
                  {task.status === "assigned" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-success flex items-center justify-center"
                    >
                      <span className="text-success-foreground text-xs">✓</span>
                    </motion.div>
                  )}
                  
                  {task.status === "unassigned" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive flex items-center justify-center"
                    >
                      <span className="text-destructive-foreground text-xs">✕</span>
                    </motion.div>
                  )}
                  
                  <h4 className="font-semibold text-sm">{task.title}</h4>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {task.requiredSkills.map(skill => (
                      <span key={skill} className="px-2 py-0.5 text-[10px] font-mono uppercase bg-muted text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs font-mono text-muted-foreground">
                    Est. {task.estimatedHours}h
                  </div>
                  
                  {/* Show assigned employees (single or multiple) */}
                  {(task.assignedEmployees || task.assignedEmployee) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 pt-3 border-t border-border"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {(task.assignedEmployees || [task.assignedEmployee]).filter(Boolean).map((emp) => (
                          <div key={emp!.id} className="flex items-center gap-1.5 bg-success/10 border border-success px-2 py-1 rounded">
                            <div className="w-5 h-5 bg-success text-success-foreground flex items-center justify-center text-[9px] font-mono font-bold">
                              {emp!.avatar}
                            </div>
                            <span className="text-[10px] font-semibold">{emp!.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Show unassigned message */}
                  {task.status === "unassigned" && !task.assignedEmployee && !task.assignedEmployees && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 pt-3 border-t border-destructive/30"
                    >
                      <div className="flex items-center gap-2 text-destructive">
                        <span className="text-xs">✕</span>
                        <span className="text-[11px] font-medium">Unassigned - No suitable resource found</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Connection Lines (Visual only) */}
          <div className="col-span-2 flex items-center justify-center">
            <AnimatePresence>
              {connections.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex flex-col justify-center items-center gap-2"
                >
                  {connections.slice(-3).map((conn, idx) => (
                    <motion.div
                      key={`${conn.from}-${conn.to}-${idx}`}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`h-0.5 w-full origin-left ${
                        conn.status === "matched" ? "bg-success" :
                        conn.status === "rejected" ? "bg-destructive" :
                        "bg-accent"
                      }`}
                      style={{
                        boxShadow: conn.status === "active" ? "0 0 10px hsl(var(--accent))" : "none"
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Employees Column */}
          <div className="col-span-6">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Available Resources
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence mode="popLayout">
                {employees.map((employee, idx) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    status={candidateStates[employee.id] || "idle"}
                    thinkingText={
                      candidateStates[employee.id] === "analyzing" 
                        ? thinkingMessages[employee.id] 
                        : candidateStates[employee.id] === "matched"
                          ? thinkingMessages[employee.id]
                          : undefined
                    }
                    rejectionReason={
                      candidateStates[employee.id] === "rejected"
                        ? rejectionReasons[employee.id]
                        : undefined
                    }
                    delay={idx * 50}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* LLM Status */}
        {llmStatus && isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 p-3 bg-accent/10 border border-accent"
          >
            <p className="text-xs font-mono text-accent">{llmStatus}</p>
          </motion.div>
        )}

        {/* Empty state */}
        {!isProcessing && currentTaskIndex === -1 && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-2xl text-muted-foreground/50">⚡</span>
              </div>
              <p className="text-muted-foreground font-mono text-sm">
                Submit a feature request to begin AI allocation
              </p>
            </div>
          </motion.div>
        )}

        {/* Final Allocation Summary - Centered Hierarchical View */}
        {!isProcessing && tasks.length > 0 && tasks.every(t => t.status === "assigned" || t.status === "unassigned") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 mt-12 pt-8 border-t-2 border-success/30"
          >
            {/* Section Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-8"
            >
              <span className="inline-block px-4 py-2 bg-success/10 border border-success text-success text-xs font-mono uppercase tracking-widest">
                ✓ Allocation Complete
              </span>
            </motion.div>
            
            {/* Main Feature/Sprint Name - Top Center */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="relative mb-12"
              >
                <div className="px-10 py-6 bg-foreground text-background border-2 border-foreground text-center min-w-[280px]">
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-60 block mb-1">
                    Feature / Sprint
                  </span>
                  <span className="font-bold text-2xl block">{featureData?.feature}</span>
                  {featureData && (
                    <div className="flex items-center justify-center gap-3 mt-3 text-xs opacity-60">
                      {featureData.budget !== null && (
                        <>
                          <span>💰 ${featureData.budget.toLocaleString()}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>📅 {featureData.deadlineWeeks} weeks</span>
                      <span>•</span>
                      <span>📋 {tasks.length} tasks</span>
                    </div>
                  )}
                </div>
                
                {/* Animated pulse effect */}
                <motion.div
                  className="absolute inset-0 bg-foreground/20 border-2 border-foreground pointer-events-none"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.05, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
                
                {/* Connector line going down */}
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-12 bg-gradient-to-b from-foreground to-success"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  style={{ transformOrigin: 'top' }}
                />
              </motion.div>

              {/* Tasks with Assigned Employees */}
              <div className="w-full max-w-5xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-center mb-6"
                >
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Task Breakdown & Assignments
                  </span>
                </motion.div>
                
                {/* Tasks Grid */}
                <div className="flex flex-wrap justify-center gap-6">
                  {tasks.map((task, idx) => {
                    const assignedEmployees = task.assignedEmployees || (task.assignedEmployee ? [task.assignedEmployee] : []);
                    const isUnassigned = task.status === "unassigned" || assignedEmployees.length === 0;
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          delay: 0.9 + idx * 0.15, 
                          type: "spring", 
                          stiffness: 150,
                          damping: 15
                        }}
                        className="flex flex-col items-center"
                        style={{ width: Math.max(200, Math.max(1, assignedEmployees.length) * 120) }}
                      >
                        {/* Task Card */}
                        <motion.div
                          className={`w-full p-4 bg-card border-2 text-center relative ${isUnassigned ? 'border-destructive' : 'border-border'}`}
                          whileHover={{ scale: 1.02, borderColor: isUnassigned ? "hsl(var(--destructive))" : "hsl(var(--success))" }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {/* Task number badge */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.0 + idx * 0.15, type: "spring" }}
                            className={`absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center text-xs font-mono font-bold ${isUnassigned ? 'bg-destructive text-destructive-foreground' : 'bg-foreground text-background'}`}
                          >
                            {idx + 1}
                          </motion.div>
                          
                          {/* Team size badge or Unassigned badge */}
                          {isUnassigned ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 1.0 + idx * 0.15, type: "spring" }}
                              className="absolute -top-3 -right-3 px-2 py-0.5 bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-mono font-bold"
                            >
                              ✕ Unassigned
                            </motion.div>
                          ) : assignedEmployees.length > 1 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 1.0 + idx * 0.15, type: "spring" }}
                              className="absolute -top-3 -right-3 px-2 py-0.5 bg-success text-success-foreground flex items-center justify-center text-[10px] font-mono font-bold"
                            >
                              {assignedEmployees.length} people
                            </motion.div>
                          )}
                          
                          <h4 className="font-semibold text-sm mb-2 leading-tight">{task.title}</h4>
                          
                          {/* Skills */}
                          <div className="flex flex-wrap justify-center gap-1 mb-2">
                            {task.requiredSkills.slice(0, 3).map(skill => (
                              <span 
                                key={skill} 
                                className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-muted text-muted-foreground"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                          
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ⏱ {task.estimatedHours}h
                          </span>
                        </motion.div>
                        
                        {/* Connector line to employees */}
                        <motion.div
                          className={`w-0.5 h-6 bg-gradient-to-b ${isUnassigned ? 'from-border to-destructive' : 'from-border to-success'}`}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 1.1 + idx * 0.15, duration: 0.3 }}
                          style={{ transformOrigin: 'top' }}
                        />
                        
                        {/* Arrow indicator */}
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.2 + idx * 0.15 }}
                          className={`text-xs mb-1 ${isUnassigned ? 'text-destructive' : 'text-success'}`}
                        >
                          ▼
                        </motion.div>
                        
                        {/* Unassigned state */}
                        {isUnassigned ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              delay: 1.25 + idx * 0.15, 
                              type: "spring", 
                              stiffness: 200 
                            }}
                            className="w-full p-3 bg-destructive/10 border-2 border-destructive border-dashed text-center"
                          >
                            <motion.div 
                              className="w-12 h-12 mx-auto bg-destructive/20 text-destructive flex items-center justify-center font-mono font-bold mb-2 text-xl"
                              initial={{ rotate: -15, scale: 0 }}
                              animate={{ rotate: 0, scale: 1 }}
                              transition={{ delay: 1.35 + idx * 0.15, type: "spring", stiffness: 300 }}
                            >
                              ?
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1.4 + idx * 0.15 }}
                            >
                              <span className="font-semibold block text-sm text-destructive">Unassigned</span>
                              <span className="text-[9px] text-muted-foreground font-mono block mt-0.5">
                                No suitable resource found
                              </span>
                            </motion.div>
                          </motion.div>
                        ) : (
                          /* Assigned Employees - horizontal layout for multiple */
                          <div className={`flex ${assignedEmployees.length > 1 ? 'gap-2' : ''} justify-center w-full`}>
                            {assignedEmployees.map((emp, empIdx) => (
                              <motion.div
                                key={emp.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ 
                                  delay: 1.25 + idx * 0.15 + empIdx * 0.1, 
                                  type: "spring", 
                                  stiffness: 200 
                                }}
                                whileHover={{ scale: 1.05 }}
                                className={`p-3 bg-success/10 border-2 border-success text-center ${assignedEmployees.length === 1 ? 'w-full' : 'flex-1 min-w-[100px]'}`}
                                style={{ boxShadow: "0 0 20px hsl(var(--success) / 0.15)" }}
                              >
                                <motion.div 
                                  className={`${assignedEmployees.length > 1 ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-lg'} mx-auto bg-success text-success-foreground flex items-center justify-center font-mono font-bold mb-2`}
                                  initial={{ rotate: -15, scale: 0 }}
                                  animate={{ rotate: 0, scale: 1 }}
                                  transition={{ delay: 1.35 + idx * 0.15 + empIdx * 0.1, type: "spring", stiffness: 300 }}
                                >
                                  {emp.avatar}
                                </motion.div>
                                
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 1.4 + idx * 0.15 + empIdx * 0.1 }}
                                >
                                  <span className={`font-semibold block ${assignedEmployees.length > 1 ? 'text-xs' : 'text-sm'}`}>{emp.name}</span>
                                  <span className="text-[9px] text-muted-foreground font-mono block mt-0.5">
                                    {emp.role}
                                  </span>
                                  <span className="text-[8px] text-success font-mono mt-1 block">
                                    ${emp.hourlyRate}/hr
                                  </span>
                                </motion.div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              
              {/* Summary Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + tasks.length * 0.15 }}
                className="mt-10 flex items-center justify-center gap-8 pt-6 border-t border-border"
              >
                <div className="text-center">
                  <span className="text-2xl font-bold text-success">
                    {tasks.filter(t => t.status === "assigned").length}
                  </span>
                  <span className="block text-xs font-mono text-muted-foreground uppercase mt-1">
                    Tasks Assigned
                  </span>
                </div>
                {tasks.filter(t => t.status === "unassigned").length > 0 && (
                  <>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <span className="text-2xl font-bold text-destructive">
                        {tasks.filter(t => t.status === "unassigned").length}
                      </span>
                      <span className="block text-xs font-mono text-muted-foreground uppercase mt-1">
                        Unassigned
                      </span>
                    </div>
                  </>
                )}
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <span className="text-2xl font-bold text-success">
                    {new Set(tasks.flatMap(t => 
                      (t.assignedEmployees || (t.assignedEmployee ? [t.assignedEmployee] : []))
                        .map(e => e.id)
                    )).size}
                  </span>
                  <span className="block text-xs font-mono text-muted-foreground uppercase mt-1">
                    Team Members
                  </span>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <span className="text-2xl font-bold text-success">
                    {tasks.reduce((sum, t) => sum + t.estimatedHours, 0)}h
                  </span>
                  <span className="block text-xs font-mono text-muted-foreground uppercase mt-1">
                    Total Hours
                  </span>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <span className="text-2xl font-bold text-success">
                    {tasks.reduce((sum, t) => sum + (t.assignedEmployees?.length || (t.assignedEmployee ? 1 : 0)), 0)}
                  </span>
                  <span className="block text-xs font-mono text-muted-foreground uppercase mt-1">
                    Assignments
                  </span>
                </div>
              </motion.div>
              
              {/* Simulate Delays Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 + tasks.length * 0.15 }}
                className="mt-8 flex justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    // Prepare allocation data for delay prediction
                    const allocationData: AllocationData = {
                      tasks: tasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        required_skills: t.requiredSkills,
                        estimated_hours: t.estimatedHours,
                        assigned_employee_ids: t.assignedEmployees?.map(e => e.id) || (t.assignedEmployee ? [t.assignedEmployee.id] : []),
                        status: t.status
                      })),
                      employees: employees.map(e => ({
                        id: e.id,
                        name: e.name,
                        role: e.role,
                        tech_stack: e.techStack,
                        hourly_rate: e.hourlyRate,
                        workload: e.workload
                      })),
                      deadline_weeks: featureData?.deadlineWeeks || 4,
                      budget: featureData?.budget || 50000,
                      total_hours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0)
                    };
                    // Use callback if provided (for tab-based navigation), otherwise use router
                    if (onNavigateToDelay) {
                      onNavigateToDelay(allocationData);
                    } else {
                      navigate('/delay-prediction', { state: { allocation: allocationData } });
                    }
                  }}
                  className="px-8 py-3.5 bg-foreground text-background font-mono uppercase tracking-widest text-sm font-semibold flex items-center justify-center gap-2.5 hover:bg-accent transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>Simulate Delays</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TimelineGraph;
