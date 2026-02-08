import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Users,
  Clock,
  Tag,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface ExtractedItem {
  id: string;
  type: "feature" | "task";
  title: string;
  description: string;
  assignee?: string;
  priority: "low" | "medium" | "high";
  estimatedHours?: number;
  requiredSkills: string[];
  confidence: number;
}

interface AnalysisResult {
  items: ExtractedItem[];
  summary: string;
  participants: string[];
  meetingType: string;
}

interface JiraSyncResult {
  task_id: string;
  jira_key?: string;
  assignee: string;
  assigneeRole?: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  estimatedHours?: number;
  requiredSkills?: string[];
  status?: string;
  error?: string;
}

interface MeetingTranscriptProps {
  onBack: () => void;
  onNavigateToSmartAllocate: (featureData: {
    feature: string;
    description: string;
    techStack: string[];
  }) => void;
}

export default function MeetingTranscript({
  onBack,
  onNavigateToSmartAllocate,
}: MeetingTranscriptProps) {
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<JiraSyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analyze transcript
  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setError("Please enter a meeting transcript or summary");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setSyncResults(null);

    try {
      const response = await fetch("/api/transcript/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze transcript");
      }

      setAnalysisResult(data);
      // Auto-select all items
      setSelectedItems(new Set(data.items.map((item: ExtractedItem) => item.id)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle item selection
  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Handle feature - redirect to Smart Allocate
  const handleFeatureAction = (item: ExtractedItem) => {
    onNavigateToSmartAllocate({
      feature: item.title,
      description: item.description,
      techStack: item.requiredSkills,
    });
  };

  // Create Jira tickets for tasks
  const handleCreateJiraTickets = async () => {
    if (!analysisResult) return;

    const tasksToSync = analysisResult.items.filter(
      (item) => item.type === "task" && selectedItems.has(item.id)
    );

    if (tasksToSync.length === 0) {
      setError("No tasks selected for Jira sync");
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/transcript/create-jira-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksToSync }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Jira tickets");
      }

      setSyncResults(data.results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedTasks = analysisResult?.items.filter(
    (item) => item.type === "task" && selectedItems.has(item.id)
  );
  const selectedFeatures = analysisResult?.items.filter(
    (item) => item.type === "feature" && selectedItems.has(item.id)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b-2 border-foreground bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Meeting Transcript Analyzer
              </h1>
              <p className="text-xs text-muted-foreground">
                Extract tasks and features from meeting notes
              </p>
            </div>
          </div>
          {analysisResult && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded">
                {analysisResult.items.filter((i) => i.type === "feature").length} Features
              </span>
              <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded">
                {analysisResult.items.filter((i) => i.type === "task").length} Tasks
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5" />
              <h2 className="font-semibold">Paste Meeting Transcript or Summary</h2>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`Paste your meeting transcript or summary here...

Example:
"In today's sprint planning, we discussed the new authentication feature. 
John will handle the backend API integration, estimated 16 hours.
Sarah will work on the React login components, about 12 hours.
We also need to set up CI/CD pipeline - David to handle this.
The payment gateway integration is a larger feature that needs full planning..."`}
              className="w-full h-48 p-4 bg-background border-2 border-border focus:border-foreground transition-colors resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                AI will extract actionable items, identify assignees, and categorize as features or tasks
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !transcript.trim()}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze Transcript
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 border-2 border-destructive bg-destructive/10 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-destructive hover:underline text-sm"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Meeting Summary */}
              <div className="border-2 border-border bg-card p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Meeting Summary
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {analysisResult.summary}
                </p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Participants: {analysisResult.participants.join(", ") || "Not identified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span>Type: {analysisResult.meetingType}</span>
                  </div>
                </div>
              </div>

              {/* Extracted Items */}
              <div className="border-2 border-foreground bg-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Extracted Action Items
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedItems(new Set(analysisResult.items.map((i) => i.id)))}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => setSelectedItems(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {analysisResult.items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`border-2 p-4 transition-all cursor-pointer ${
                        selectedItems.has(item.id)
                          ? item.type === "feature"
                            ? "border-blue-500 bg-blue-500/5"
                            : "border-green-500 bg-green-500/5"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            selectedItems.has(item.id)
                              ? item.type === "feature"
                                ? "border-blue-500 bg-blue-500"
                                : "border-green-500 bg-green-500"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedItems.has(item.id) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono uppercase ${
                                item.type === "feature"
                                  ? "bg-blue-500/20 text-blue-500"
                                  : "bg-green-500/20 text-green-500"
                              }`}
                            >
                              {item.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono uppercase ${
                                item.priority === "high"
                                  ? "bg-red-500/20 text-red-500"
                                  : item.priority === "medium"
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : "bg-gray-500/20 text-gray-500"
                              }`}
                            >
                              {item.priority}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(item.confidence * 100)}% confidence
                            </span>
                          </div>

                          <h4 className="font-semibold mb-1">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            {item.assignee && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span>{item.assignee}</span>
                              </div>
                            )}
                            {item.estimatedHours && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{item.estimatedHours}h estimated</span>
                              </div>
                            )}
                            {item.requiredSkills.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <Tag className="w-3 h-3 text-muted-foreground" />
                                {item.requiredSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px]"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        {item.type === "feature" && selectedItems.has(item.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFeatureAction(item);
                            }}
                            className="gap-1 flex-shrink-0"
                          >
                            Plan Feature
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-2 border-foreground bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Ready to Process</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedTasks?.length || 0} tasks selected for Jira •{" "}
                      {selectedFeatures?.length || 0} features for planning
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {selectedFeatures && selectedFeatures.length === 1 && (
                      <Button
                        variant="outline"
                        onClick={() => handleFeatureAction(selectedFeatures[0])}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Plan Feature in Smart Allocate
                      </Button>
                    )}
                    {selectedTasks && selectedTasks.length > 0 && (
                      <Button
                        onClick={handleCreateJiraTickets}
                        disabled={isSyncing}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating Tickets...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Create {selectedTasks.length} Jira Tickets
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Results - JIRA Tickets Created */}
              <AnimatePresence>
                {syncResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-foreground bg-card p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <span className="text-lg">🎫</span>
                        JIRA Tickets Created
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {syncResults.filter(r => !r.error).length} tickets synced to Jira
                      </p>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {syncResults.map((result, idx) => (
                        <motion.div
                          key={result.task_id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`rounded-lg border overflow-hidden ${
                            result.error
                              ? "bg-red-50 border-red-200"
                              : "bg-white border-gray-200 shadow-sm"
                          }`}
                        >
                          {/* Ticket Header */}
                          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <span className={`text-xs font-mono font-bold ${
                              result.error ? "text-red-600" : "text-blue-600"
                            }`}>
                              {result.jira_key || "FAILED"}
                            </span>
                            <div className="flex items-center gap-2">
                              {result.estimatedHours && (
                                <span className="text-[10px] px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                                  ⏱ {result.estimatedHours}h
                                </span>
                              )}
                              {result.priority && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    result.priority === "high"
                                      ? "bg-red-100 text-red-700"
                                      : result.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {result.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Ticket Content */}
                          <div className="p-3">
                            <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">
                              {result.title}
                            </p>
                            
                            {/* Task Description / Work Breakdown */}
                            {result.description && (
                              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                                  📋 Work Description
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                  {result.description}
                                </p>
                              </div>
                            )}
                            
                            {/* Required Skills */}
                            {result.requiredSkills && result.requiredSkills.length > 0 && (
                              <div className="mb-3">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  🔧 Required Skills
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {result.requiredSkills.map((skill, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Assignee */}
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                                {result.assignee
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div className="flex-1">
                                <span className="text-xs font-medium text-gray-700 block">
                                  {result.assignee}
                                </span>
                                {result.assigneeRole && (
                                  <span className="text-[10px] text-gray-500">
                                    {result.assigneeRole}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                result.error
                                  ? "bg-red-100 text-red-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}>
                                {result.error ? "failed" : "todo"}
                              </span>
                            </div>
                            
                            {/* Error message */}
                            {result.error && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-xs text-red-600">
                                  <AlertCircle className="w-3 h-3 inline mr-1" />
                                  {result.error}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!analysisResult && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Transcript Analyzed</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Paste your meeting transcript or summary above and click "Analyze Transcript" 
              to extract tasks and features automatically.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
