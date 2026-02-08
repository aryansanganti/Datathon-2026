import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";

// Reuse the existing node components
import PMNode from "@/components/nodes/PMNode";
import TeamNode from "@/components/nodes/TeamNode";
import MemberNode from "@/components/nodes/MemberNode";

// Types for the allocation simulation
interface TaskData {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  estimated_hours: number;
  assigned_employee_ids: string[];
  status: string;
}

interface EmployeeData {
  id: string;
  name: string;
  role: string;
  tech_stack: string[];
  hourly_rate: number;
  workload: number;
}

interface AllocationData {
  tasks: TaskData[];
  employees: EmployeeData[];
  deadline_weeks: number;
  budget: number;
  total_hours: number;
}

interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  assignee: string;
  assigneeRole: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  requiredSkills: string[];
}

interface AllocationSimulationProps {
  allocationData: AllocationData | null;
  onBack: () => void;
  onContinueToDelay: () => void;
}

const nodeTypes = {
  pmNode: PMNode,
  teamNode: TeamNode,
  memberNode: MemberNode,
};

const TEAM_COLORS: Record<string, string> = {
  tech: "#3b82f6",
  engineering: "#3b82f6",
  marketing: "#f97316",
  design: "#a855f7",
  editing: "#10b981",
  qa: "#06b6d4",
  default: "#6366f1",
};

// Determine team from role/skills
function getTeamFromRole(role: string, skills: string[]): string {
  const r = role.toLowerCase();
  const s = skills.map((sk) => sk.toLowerCase()).join(" ");

  if (
    r.includes("engineer") ||
    r.includes("developer") ||
    r.includes("backend") ||
    r.includes("frontend") ||
    s.includes("react") ||
    s.includes("node") ||
    s.includes("python")
  ) {
    return "tech";
  }
  if (r.includes("marketing") || r.includes("seo") || r.includes("content")) {
    return "marketing";
  }
  if (r.includes("design") || r.includes("ui") || r.includes("ux")) {
    return "design";
  }
  if (r.includes("qa") || r.includes("test") || r.includes("quality")) {
    return "qa";
  }
  if (r.includes("edit") || r.includes("writer") || r.includes("copy")) {
    return "editing";
  }
  return "tech";
}

// Generate JIRA tickets from tasks with full details
function generateJiraTickets(
  tasks: TaskData[],
  employees: EmployeeData[]
): JiraTicket[] {
  return tasks.map((task, idx) => {
    const assigneeId = task.assigned_employee_ids[0];
    const employee = employees.find((e) => e.id === assigneeId);
    return {
      key: `PROJ-${1001 + idx}`,
      summary: task.title,
      description: task.description || `Work on ${task.title}`,
      assignee: employee?.name || "Unassigned",
      assigneeRole: employee?.role || "Unknown",
      status: "todo" as const,
      priority:
        task.estimated_hours > 20
          ? ("high" as const)
          : task.estimated_hours > 10
            ? ("medium" as const)
            : ("low" as const),
      estimatedHours: task.estimated_hours,
      requiredSkills: task.required_skills,
    };
  });
}

// Save tasks to database
async function saveTasksToDatabase(allocationData: AllocationData): Promise<void> {
  try {
    const response = await fetch('/api/tasks/save-allocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: allocationData.tasks,
        deadline_weeks: allocationData.deadline_weeks,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Failed to save tasks:', result);
      throw new Error(result.error || 'Failed to save tasks');
    }

    console.log('✅ Tasks saved to database:', result);
  } catch (error) {
    console.error('Error saving tasks to database:', error);
    // Don't throw - just log the error so simulation can complete
  }
}

// Sync tasks to Jira
async function syncTasksToJira(): Promise<{success: boolean, results?: any, error?: string}> {
  try {
    const response = await fetch('/api/jira/sync-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Failed to sync to Jira:', result);
      return { success: false, error: result.error || 'Failed to sync to Jira' };
    }

    console.log('✅ Tasks synced to Jira:', result);
    return { success: true, results: result.results };
  } catch (error) {
    console.error('Error syncing tasks to Jira:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Animation phases
type SimulationPhase =
  | "idle"
  | "pm"
  | "teams"
  | "members"
  | "connections"
  | "jira"
  | "complete";

export default function AllocationSimulation({
  allocationData,
  onBack,
  onContinueToDelay,
}: AllocationSimulationProps) {
  const [phase, setPhase] = useState<SimulationPhase>("idle");
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [visibleEdges, setVisibleEdges] = useState<Set<string>>(new Set());
  const [jiraTickets, setJiraTickets] = useState<JiraTicket[]>([]);
  const [currentJiraIndex, setCurrentJiraIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState(
    "Ready to simulate allocation..."
  );
  const [jiraSyncing, setJiraSyncing] = useState(false);
  const [jiraSyncComplete, setJiraSyncComplete] = useState(false);
  const [jiraSyncResults, setJiraSyncResults] = useState<any>(null);

  // Build graph data from allocation
  const { allNodes, allEdges, teams } = useMemo(() => {
    if (!allocationData || allocationData.tasks.length === 0) {
      return { allNodes: [], allEdges: [], teams: [] as string[] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group tasks by team
    const teamGroups: Record<
      string,
      { tasks: TaskData[]; employees: EmployeeData[] }
    > = {};

    allocationData.tasks.forEach((task) => {
      const assigneeId = task.assigned_employee_ids[0];
      const employee = allocationData.employees.find(
        (e) => e.id === assigneeId
      );
      const team = employee
        ? getTeamFromRole(employee.role, employee.tech_stack)
        : "tech";

      if (!teamGroups[team]) {
        teamGroups[team] = { tasks: [], employees: [] };
      }
      teamGroups[team].tasks.push(task);
      if (employee && !teamGroups[team].employees.find((e) => e.id === employee.id)) {
        teamGroups[team].employees.push(employee);
      }
    });

    const teamKeys = Object.keys(teamGroups);
    const teamSpacing = 450;
    const totalWidth = (teamKeys.length - 1) * teamSpacing;
    const startX = -totalWidth / 2;

    // PM Node
    nodes.push({
      id: "pm",
      type: "pmNode",
      position: { x: -140, y: 0 },
      data: {
        label: "Product Manager",
        name: "Product Manager",
        role: "Project Lead",
        taskDescription: `${allocationData.tasks.length} tasks allocated to ${allocationData.employees.filter((e) =>
          allocationData.tasks.some((t) => t.assigned_employee_ids.includes(e.id))
        ).length} team members`,
        taskType: "allocation",
        aiGenerated: true,
      },
    });

    // Team nodes and member nodes
    teamKeys.forEach((teamKey, teamIndex) => {
      const teamData = teamGroups[teamKey];
      const teamX = startX + teamIndex * teamSpacing;

      const teamNodeId = `team-${teamKey}`;
      nodes.push({
        id: teamNodeId,
        type: "teamNode",
        position: { x: teamX, y: 250 },
        data: {
          label: `${teamKey.charAt(0).toUpperCase() + teamKey.slice(1)} Team`,
          teamName: `${teamKey.charAt(0).toUpperCase() + teamKey.slice(1)} Team`,
          description: `${teamData.tasks.length} tasks assigned`,
          taskCount: teamData.tasks.length,
          teamKey,
        },
      });

      // Edge from PM to Team
      edges.push({
        id: `pm-to-${teamKey}`,
        source: "pm",
        target: teamNodeId,
        animated: true,
        style: {
          stroke: TEAM_COLORS[teamKey] || TEAM_COLORS.default,
          strokeWidth: 3,
        },
        type: "smoothstep",
        label: `${teamData.tasks.length} tasks`,
        labelStyle: { fontSize: 11, fontWeight: 600, fill: "#64748b" },
        labelBgStyle: { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 6,
      });

      // Member nodes for each task
      const memberSpacing = 380;
      const totalMembers = teamData.tasks.length;
      const memberTotalWidth = (totalMembers - 1) * memberSpacing;
      const memberStartX = teamX - memberTotalWidth / 2;

      teamData.tasks.forEach((task, taskIndex) => {
        const assigneeId = task.assigned_employee_ids[0];
        const employee = allocationData.employees.find(
          (e) => e.id === assigneeId
        );
        if (!employee) return;

        const memberNodeId = `member-${teamKey}-${taskIndex}`;
        const memberX = memberStartX + taskIndex * memberSpacing;

        nodes.push({
          id: memberNodeId,
          type: "memberNode",
          position: { x: memberX, y: 500 },
          data: {
            label: employee.name,
            memberName: employee.name,
            memberRole: employee.role,
            taskTitle: task.title,
            taskDescription: task.description || "",
            taskReasoning: `Assigned based on ${task.required_skills.slice(0, 2).join(" & ")} expertise`,
            complexity:
              task.estimated_hours > 20
                ? "high"
                : task.estimated_hours > 10
                  ? "medium"
                  : "low",
            estimatedHours: task.estimated_hours,
            totalScore: 0.85,
            scoreBreakdown: {
              skill_match: 0.9,
              experience: 0.85,
              availability: 0.8,
              past_performance: 0.88,
              expertise_depth: 0.82,
            },
            reasoning: [
              `Skills match: ${task.required_skills.slice(0, 2).join(", ")}`,
              `Experience in ${employee.role}`,
              `Available capacity: ${100 - employee.workload}%`,
            ],
            yearsOfExperience: Math.floor(Math.random() * 8) + 2,
            availability: employee.workload < 70 ? "Free" : "Partially Free",
            freeSlotsPerWeek: Math.floor((100 - employee.workload) / 10),
            requiredSkills: task.required_skills,
            allCandidates: [],
            teamKey,
          },
        });

        edges.push({
          id: `${teamNodeId}-to-${memberNodeId}`,
          source: teamNodeId,
          target: memberNodeId,
          animated: false,
          style: {
            stroke: TEAM_COLORS[teamKey] || TEAM_COLORS.default,
            strokeWidth: 2,
          },
          type: "smoothstep",
          label: `PROJ-${1001 + allocationData.tasks.indexOf(task)}`,
          labelStyle: { fontSize: 10, fontWeight: 600, fill: "#64748b" },
          labelBgStyle: { fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1 },
          labelBgPadding: [4, 3] as [number, number],
          labelBgBorderRadius: 4,
        });
      });
    });

    return { allNodes: nodes, allEdges: edges, teams: teamKeys };
  }, [allocationData]);

  // Filter visible nodes and edges
  const displayNodes = useMemo(
    () => allNodes.filter((n) => visibleNodes.has(n.id)),
    [allNodes, visibleNodes]
  );
  const displayEdges = useMemo(
    () => allEdges.filter((e) => visibleEdges.has(e.id)),
    [allEdges, visibleEdges]
  );

  const [nodes, , onNodesChange] = useNodesState(displayNodes);
  const [edges, , onEdgesChange] = useEdgesState(displayEdges);

  // Update nodes and edges when display changes
  useEffect(() => {
    // Force update by resetting
  }, [displayNodes, displayEdges]);

  const onInit = useCallback(
    (instance: { fitView: (options?: { duration?: number }) => void }) => {
      setTimeout(() => instance.fitView({ duration: 500 }), 100);
    },
    []
  );

  // Run the simulation
  const runSimulation = useCallback(async () => {
    if (!allocationData || allNodes.length === 0) return;

    setPhase("pm");
    setStatusMessage("Initializing Product Manager node...");
    await new Promise((r) => setTimeout(r, 800));

    // Show PM node
    setVisibleNodes(new Set(["pm"]));
    setStatusMessage("Product Manager assigned. Expanding to teams...");
    await new Promise((r) => setTimeout(r, 1000));

    // Show team nodes one by one
    setPhase("teams");
    for (const team of teams) {
      const teamNodeId = `team-${team}`;
      setVisibleNodes((prev) => new Set([...prev, teamNodeId]));
      setVisibleEdges((prev) => new Set([...prev, `pm-to-${team}`]));
      setStatusMessage(
        `Assigning ${team.charAt(0).toUpperCase() + team.slice(1)} Team...`
      );
      await new Promise((r) => setTimeout(r, 700));
    }

    setStatusMessage("Teams assigned. Allocating team members...");
    await new Promise((r) => setTimeout(r, 800));

    // Show member nodes
    setPhase("members");
    const memberNodes = allNodes.filter((n) => n.id.startsWith("member-"));
    const memberEdges = allEdges.filter(
      (e) => e.source.startsWith("team-") && e.target.startsWith("member-")
    );

    for (let i = 0; i < memberNodes.length; i++) {
      const node = memberNodes[i];
      const edge = memberEdges.find((e) => e.target === node.id);
      setVisibleNodes((prev) => new Set([...prev, node.id]));
      if (edge) {
        setVisibleEdges((prev) => new Set([...prev, edge.id]));
      }
      setStatusMessage(
        `Assigning ${(node.data as Record<string, unknown>).memberName as string} to ${(node.data as Record<string, unknown>).taskTitle as string}...`
      );
      await new Promise((r) => setTimeout(r, 500));
    }

    setStatusMessage("All members assigned. Creating JIRA tickets...");
    await new Promise((r) => setTimeout(r, 800));

    // Show JIRA tickets
    setPhase("jira");
    const tickets = generateJiraTickets(
      allocationData.tasks,
      allocationData.employees
    );
    setJiraTickets(tickets);

    for (let i = 0; i < tickets.length; i++) {
      setCurrentJiraIndex(i);
      setStatusMessage(`Creating ${tickets[i].key}: ${tickets[i].summary}...`);
      await new Promise((r) => setTimeout(r, 400));
    }

    // Save tasks to database
    setStatusMessage("Saving tasks to database...");
    await saveTasksToDatabase(allocationData);

    setPhase("complete");
    setStatusMessage("✓ Allocation simulation complete!");
  }, [allocationData, allNodes, allEdges, teams]);

  // Start simulation when data is available
  useEffect(() => {
    if (allocationData && phase === "idle" && allNodes.length > 0) {
      runSimulation();
    }
  }, [allocationData, phase, allNodes.length, runSimulation]);

  // Handle syncing to Jira
  const handleSyncToJira = async () => {
    setJiraSyncing(true);
    setStatusMessage("Syncing tasks to Jira...");
    
    const result = await syncTasksToJira();
    
    setJiraSyncing(false);
    
    if (result.success) {
      setJiraSyncComplete(true);
      setJiraSyncResults(result.results);
      setStatusMessage(`✓ Successfully synced ${result.results?.created || 0} tasks to Jira!`);
    } else {
      setStatusMessage(`✗ Failed to sync to Jira: ${result.error}`);
    }
  };

  if (!allocationData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No Allocation Data</h2>
          <p className="text-muted-foreground mb-4">
            Please run Smart Allocation first.
          </p>
          <Button onClick={onBack}>← Back to Smart Allocate</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Allocation Graph Simulation</h1>
            <p className="text-sm text-muted-foreground">
              Visualizing team assignments and JIRA ticket creation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <motion.div
              className={`w-2 h-2 rounded-full ${
                phase === "complete" ? "bg-green-500" : "bg-blue-500"
              }`}
              animate={
                phase !== "complete" ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}
              }
              transition={{ duration: 1, repeat: phase !== "complete" ? Infinity : 0 }}
            />
            <span className="text-sm font-mono">{statusMessage}</span>
          </div>
          {phase === "complete" && !jiraSyncComplete && (
            <Button 
              onClick={handleSyncToJira} 
              disabled={jiraSyncing}
              className="gap-2 font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {jiraSyncing ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Syncing to Jira...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v6" />
                    <path d="M12 18v4" />
                    <path d="m4.93 4.93 4.24 4.24" />
                    <path d="m14.83 14.83 4.24 4.24" />
                    <path d="M2 12h6" />
                    <path d="M16 12h6" />
                    <path d="m4.93 19.07 4.24-4.24" />
                    <path d="m14.83 9.17 4.24-4.24" />
                  </svg>
                  Sync to Jira
                </>
              )}
            </Button>
          )}
          {jiraSyncComplete && (
            <Button onClick={onContinueToDelay} className="gap-2 font-semibold">
              Continue to Delay Prediction
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Graph */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={onInit}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            minZoom={0.1}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#e2e8f0"
            />
            <Controls className="bg-white shadow-lg rounded-lg" />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "pmNode") return "#7c3aed";
                if (node.type === "teamNode") {
                  const teamKey = (node.data as Record<string, unknown>)
                    .teamKey as string;
                  return TEAM_COLORS[teamKey] || TEAM_COLORS.default;
                }
                return "#94a3b8";
              }}
              className="rounded-lg shadow-lg"
              maskColor="rgba(0,0,0,0.1)"
            />
          </ReactFlow>

          {/* Phase indicator overlay */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Simulation Progress
            </div>
            <div className="space-y-2">
              {[
                { id: "pm", label: "Product Manager", icon: "👤" },
                { id: "teams", label: "Team Assignment", icon: "👥" },
                { id: "members", label: "Member Allocation", icon: "🧑‍💻" },
                { id: "jira", label: "JIRA Tickets", icon: "🎫" },
                { id: "complete", label: "Complete", icon: "✓" },
              ].map((step, idx) => {
                const phases: SimulationPhase[] = [
                  "pm",
                  "teams",
                  "members",
                  "jira",
                  "complete",
                ];
                const currentIdx = phases.indexOf(phase);
                const stepIdx = phases.indexOf(step.id as SimulationPhase);
                const isActive = stepIdx === currentIdx;
                const isComplete = stepIdx < currentIdx;

                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isComplete
                          ? "bg-green-100 text-green-700"
                          : isActive
                            ? "bg-blue-100 text-blue-700 animate-pulse"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isComplete ? "✓" : step.icon}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive
                          ? "font-semibold text-gray-800"
                          : isComplete
                            ? "text-green-700"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* JIRA Tickets Panel */}
        <AnimatePresence>
          {(phase === "jira" || phase === "complete") && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-lg">🎫</span>
                  JIRA Tickets Created
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {jiraTickets.length} tickets auto-generated from AI allocation
                </p>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                {jiraTickets.map((ticket, idx) => (
                  <motion.div
                    key={ticket.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{
                      opacity: idx <= currentJiraIndex ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ delay: 0.1 }}
                    className={`rounded-lg border overflow-hidden ${
                      idx <= currentJiraIndex
                        ? "bg-white border-gray-200 shadow-sm"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    {/* Ticket Header */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {ticket.key}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                          ⏱ {ticket.estimatedHours}h
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            ticket.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : ticket.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    
                    {/* Ticket Content */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">
                        {ticket.summary}
                      </p>
                      
                      {/* Task Description / Work Breakdown */}
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                          📋 Work Description
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {ticket.description}
                        </p>
                      </div>
                      
                      {/* Required Skills */}
                      <div className="mb-3">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          🔧 Required Skills
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ticket.requiredSkills.map((skill, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Assignee */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {ticket.assignee
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-700 block">
                            {ticket.assignee}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {ticket.assigneeRole}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 rounded text-blue-600 font-medium">
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary bar at bottom */}
      {phase === "complete" && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t border-border bg-card p-4"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <span className="text-2xl font-bold text-green-600">
                  {allocationData.tasks.filter((t) => t.assigned_employee_ids.length > 0).length}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Tasks Assigned
                </span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-2xl font-bold text-blue-600">
                  {
                    new Set(
                      allocationData.tasks.flatMap((t) => t.assigned_employee_ids)
                    ).size
                  }
                </span>
                <span className="block text-xs text-muted-foreground">
                  Team Members
                </span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-2xl font-bold text-purple-600">
                  {jiraTickets.length}
                </span>
                <span className="block text-xs text-muted-foreground">
                  JIRA Tickets
                </span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-2xl font-bold text-orange-600">
                  {allocationData.total_hours}h
                </span>
                <span className="block text-xs text-muted-foreground">
                  Total Hours
                </span>
              </div>
              {jiraSyncResults && (
                <>
                  <div className="w-px h-10 bg-border" />
                  <div className="text-center">
                    <span className="text-2xl font-bold text-green-600">
                      {jiraSyncResults.created}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Synced to Jira
                    </span>
                  </div>
                </>
              )}
            </div>
            {!jiraSyncComplete ? (
              <Button
                onClick={handleSyncToJira}
                disabled={jiraSyncing}
                size="lg"
                className="gap-2 font-semibold bg-blue-600 hover:bg-blue-700"
              >
                {jiraSyncing ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Syncing to Jira...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v6" />
                      <path d="M12 18v4" />
                      <path d="m4.93 4.93 4.24 4.24" />
                      <path d="m14.83 14.83 4.24 4.24" />
                      <path d="M2 12h6" />
                      <path d="M16 12h6" />
                      <path d="m4.93 19.07 4.24-4.24" />
                      <path d="m14.83 9.17 4.24-4.24" />
                    </svg>
                    Sync to Jira
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={onContinueToDelay}
                size="lg"
                className="gap-2 font-semibold"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Allocate Tickets
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
