import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import FeatureInput from "@/components/FeatureInput";
import TimelineGraph from "@/components/TimelineGraph";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import type { LLMAllocationResponse } from "@/lib/types";

interface EmployeeInfo {
  id: string;
  name: string;
  hourlyRate: number;
  role: string;
  techStack?: string[];
  workload?: number;
}

interface Allocation {
  task: { id: string; title: string; estimatedHours: number; requiredSkills: string[] };
  employee: EmployeeInfo;
  employees?: EmployeeInfo[]; // Support multiple employees
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

interface SmartAllocateProps {
  onNavigateToDelay?: (data: AllocationData) => void;
  onBack?: () => void;
}

const SmartAllocate = ({ onNavigateToDelay, onBack }: SmartAllocateProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [featureData, setFeatureData] = useState<FeatureData | null>(null);
  const [llmResponse, setLlmResponse] = useState<LLMAllocationResponse | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (feature: string, details: string, budget: number | null, techStack: string[], deadlineWeeks: number, autoGenerateTech: boolean, priority: Priority) => {
    console.log("Processing:", feature, details, budget, techStack, deadlineWeeks, autoGenerateTech, priority);
    setIsProcessing(true);
    setShowAnalytics(false);
    setAllocations([]);
    setFeatureData({ feature, details, budget, techStack, deadlineWeeks, autoGenerateTech, priority });
    setLlmResponse(null);
    
    // Smooth scroll to timeline section after a brief delay
    setTimeout(() => {
      timelineRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });
    }, 100);
  };

  const handleAllocationComplete = useCallback((newAllocations: Allocation[], response?: LLMAllocationResponse) => {
    setAllocations(newAllocations);
    if (response) {
      setLlmResponse(response);
    }
    setIsProcessing(false);
    setTimeout(() => setShowAnalytics(true), 500);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="container py-2 flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-foreground flex items-center justify-center">
                <span className="text-background font-mono font-bold text-sm">AI</span>
              </div>
              <div>
                <h1 className="font-semibold tracking-tight text-sm">Project Allocator</h1>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Intelligent Resource Management
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-success rounded-full" />
                <span className="text-xs font-mono">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 space-y-4">
        {/* Feature Input Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight">New Feature Request</h2>
            <p className="text-muted-foreground text-sm">
              Describe your feature and let AI optimize team allocation
            </p>
          </div>
          <FeatureInput onSubmit={handleSubmit} isProcessing={isProcessing} />
        </motion.section>

        {/* Divider */}
        <div className="h-px bg-border mt-2" />

        {/* Timeline Graph Section */}
        <motion.section
          ref={timelineRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="scroll-mt-4"
        >
          <TimelineGraph 
            isProcessing={isProcessing} 
            onAllocationComplete={handleAllocationComplete}
            featureData={featureData}
            onNavigateToDelay={onNavigateToDelay}
          />
        </motion.section>

        {/* Analytics Section */}
        <AnalyticsDashboard 
          allocations={allocations} 
          isVisible={showAnalytics}
          llmResponse={llmResponse}
        />
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border mt-8">
        <div className="container py-4 flex items-center justify-between">
          <p className="text-xs font-mono text-muted-foreground">
            © 2024 AI Project Allocator. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs font-mono text-muted-foreground">v1.0.0</span>
            <span className="text-xs font-mono text-muted-foreground">
              Powered by Advanced ML Models
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SmartAllocate;
