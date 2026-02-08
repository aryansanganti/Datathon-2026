const express = require('express');
const router = express.Router();
const { allocateTask, allocateTaskSequential, allocateTaskHierarchical, loadEmployeeData, TASK_TEMPLATES } = require('../services/taskAllocator');
const { runStreamingAllocation } = require('../services/streamingAllocation');
const Task = require('../models/Task');
const User = require('../models/User');

/**
 * POST /api/tasks/save-allocation
 * Save allocated tasks to database from allocation simulation
 */
router.post('/save-allocation', async (req, res) => {
  try {
    const { tasks, deadline_weeks } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ success: false, error: 'Tasks array is required' });
    }

    const savedTasks = [];
    const errors = [];

    for (const taskData of tasks) {
      try {
        // Find the allocated user by ID
        let allocatedUser = null;
        if (taskData.assigned_employee_ids && taskData.assigned_employee_ids.length > 0) {
          const employeeId = taskData.assigned_employee_ids[0];
          allocatedUser = await User.findOne({ user_id: employeeId });
        }

        // Determine role_required from task description or skills
        const roleRequired = determineRole(taskData.required_skills, taskData.description);

        // Calculate deadline
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (deadline_weeks || 4) * 7);

        // Create task document
        const task = new Task({
          task_id: taskData.id,
          title: taskData.title,
          description: taskData.description || '',
          role_required: roleRequired,
          priority: taskData.estimated_hours > 20 ? 'high' : taskData.estimated_hours > 10 ? 'medium' : 'low',
          deadline: deadline,
          estimated_hours: taskData.estimated_hours,
          status: allocatedUser ? 'allocated' : 'pending',
          allocated_to: allocatedUser ? allocatedUser._id : null,
          jira_issue_key: `PROJ-${taskData.id.split('-').pop()}`,
          synced_to_jira: false,
        });

        await task.save();
        savedTasks.push(task);
      } catch (err) {
        console.error(`Error saving task ${taskData.id}:`, err);
        errors.push({ task_id: taskData.id, error: err.message });
      }
    }

    res.json({
      success: true,
      saved: savedTasks.length,
      errors: errors.length > 0 ? errors : undefined,
      tasks: savedTasks
    });

  } catch (error) {
    console.error('Error saving allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper function to determine role from skills
 */
function determineRole(skills, description) {
  const skillsStr = skills.join(' ').toLowerCase();
  const descStr = (description || '').toLowerCase();
  const combined = `${skillsStr} ${descStr}`;

  if (combined.includes('react') || combined.includes('vue') || combined.includes('frontend') || combined.includes('ui') || combined.includes('css')) {
    return 'frontend';
  }
  if (combined.includes('node') || combined.includes('python') || combined.includes('backend') || combined.includes('api') || combined.includes('database')) {
    return 'backend';
  }
  if (combined.includes('test') || combined.includes('qa') || combined.includes('quality')) {
    return 'qa';
  }
  if (combined.includes('devops') || combined.includes('docker') || combined.includes('kubernetes') || combined.includes('ci/cd')) {
    return 'devops';
  }
  
  return 'backend'; // Default
}

/**
 * GET /api/tasks/employees
 * Returns all employee data with team structure
 */
router.get('/employees', async (req, res) => {
  try {
    const data = await loadEmployeeData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error loading employee data:', error);
    res.status(500).json({ success: false, error: 'Failed to load employee data' });
  }
});

/**
 * GET /api/tasks/teams
 * Returns just the team structure overview
 */
router.get('/teams', async (req, res) => {
  try {
    const data = await loadEmployeeData();
    const teamsOverview = {};

    for (const [key, team] of Object.entries(data.teams)) {
      teamsOverview[key] = {
        team_name: team.team_name,
        description: team.description,
        member_count: team.members.length,
        members: team.members.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          years_of_experience: m.years_of_experience,
          availability: m.availability
        }))
      };
    }

    res.json({
      success: true,
      product_manager: data.product_manager,
      teams: teamsOverview
    });
  } catch (error) {
    console.error('Error loading teams:', error);
    res.status(500).json({ success: false, error: 'Failed to load team data' });
  }
});

/**
 * GET /api/tasks/templates
 * Returns available task type templates
 */
router.get('/templates', (req, res) => {
  const templateNames = Object.keys(TASK_TEMPLATES).map(key => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    teams: Object.keys(TASK_TEMPLATES[key]),
    total_subtasks: Object.values(TASK_TEMPLATES[key]).reduce((sum, tasks) => sum + tasks.length, 0)
  }));

  res.json({ success: true, templates: templateNames });
});

/**
 * POST /api/tasks/allocate
 * Main endpoint: takes a task description and returns the full allocation graph
 * 
 * Body: {
 *   task_description: string,
 *   task_type?: 'product_launch' | 'feature_release' | 'general',
 *   use_sequential?: boolean (default: false) - use step-by-step LLM calls (old method)
 *   use_hierarchical?: boolean (default: true) - use hierarchical LLM approach (new method)
 * }
 */
router.post('/allocate', async (req, res) => {
  try {
    const { task_description, task_type, use_sequential = false, use_hierarchical = true } = req.body;

    if (!task_description || task_description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'task_description is required'
      });
    }

    let mode = 'Template-based';
    if (use_hierarchical) {
      mode = 'Hierarchical LLM (PM→Teams→Members)';
    } else if (use_sequential) {
      mode = 'Sequential LLM (node-by-node)';
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 NEW ALLOCATION REQUEST`);
    console.log(`Task: "${task_description.trim()}"`);
    console.log(`Mode: ${mode}`);
    console.log(`${'='.repeat(60)}\n`);

    let allocation;
    if (use_hierarchical) {
      allocation = await allocateTaskHierarchical(task_description.trim());
    } else if (use_sequential) {
      allocation = await allocateTaskSequential(task_description.trim());
    } else {
      allocation = await allocateTask(task_description.trim(), task_type);
    }

    // Save generated subtasks to MongoDB
    try {
      if (allocation && allocation.allocations) {
        const Task = require('../models/Task');
        const User = require('../models/User');
        
        // We need users to map IDs
        const users = await User.find({});
        
        for (const [dept, deptAlloc] of Object.entries(allocation.allocations)) {
          if (!deptAlloc.work_assignments) continue;
          
          for (const assignment of deptAlloc.work_assignments) {
            // Find user _id
            const user = users.find(u => u.employee_id === assignment.assigned_to_id);
            
            const task = new Task({
              task_id: `TASK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              title: assignment.work_item.substring(0, 100),
              description: assignment.work_item + `\n\nReasoning: ${assignment.reasoning}`,
              role_required: user ? user.role : 'Specialist',
              priority: 'medium',
              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: 'allocated',
              allocated_to: user ? user._id : null,
              sprint_name: `Sprint ${new Date().getMonth() + 1}`
            });
            await task.save();
          }
        }
        console.log('✅ Allocation results saved to MongoDB Tasks');
      }
    } catch (dbError) {
      console.error('Error saving tasks to MongoDB:', dbError);
      // Don't fail the request if saving fails, just log it
    }

    res.json({
      success: true,
      allocation
    });
  } catch (error) {
    console.error('Error allocating task:', error);
    res.status(500).json({ success: false, error: 'Failed to allocate task' });
  }
});

/**
 * GET /api/tasks/allocate/stream
 * Streaming endpoint: generates graph node by node using Server-Sent Events
 * 
 * Query params:
 *   task_description: string - the task to allocate
 * 
 * Events sent:
 *   - allocation_start: Initial event when processing begins
 *   - pm_node_start: PM node begins processing
 *   - pm_node_complete: PM node done with department requirements
 *   - team_node_start: Team node begins (tech/marketing/editing)
 *   - team_node_complete: Team node done
 *   - member_assigned: Each member assignment
 *   - team_skipped: Team not needed for this task
 *   - allocation_complete: All done
 *   - allocation_error: Error occurred
 */
router.get('/allocate/stream', async (req, res) => {
  const { task_description } = req.query;

  if (!task_description || task_description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'task_description query parameter is required'
    });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 STREAMING ALLOCATION REQUEST`);
  console.log(`Task: "${task_description.trim()}"`);
  console.log(`Mode: Streaming (node-by-node)`);
  console.log(`${'='.repeat(60)}\n`);

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Function to send SSE events
  const sendEvent = (eventType, data) => {
    console.log(`📤 Sending event: ${eventType}`);
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const employeeData = await loadEmployeeData();
    
    // Run streaming allocation
    await runStreamingAllocation(
      task_description.trim(),
      employeeData.teams,
      sendEvent
    );

    // End the stream
    res.end();

  } catch (error) {
    console.error('Streaming allocation error:', error);
    sendEvent('allocation_error', { error: error.message });
    res.end();
  }
});

module.exports = router;
