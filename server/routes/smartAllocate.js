const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * GET /api/smart-allocate/employees
 * Returns employees in the EmployeeData format expected by smart-allocate frontend
 */
router.get('/employees', async (req, res) => {
  try {
    const users = await User.find({});
    
    console.log('📊 Found ' + users.length + ' users in MongoDB');
    
    if (!users || users.length === 0) {
      return res.json([]);
    }
    
    // Transform to smart-allocate EmployeeData format
    const formatted = users.map((user, index) => {
      const maxSlots = 40;
      const freeSlots = user.free_slots_per_week || 20;
      const workloadScore = Math.max(0, Math.min(1, 1 - (freeSlots / maxSlots)));
      
      // Map availability: Main uses "Free/Busy/Partially Free"
      const isAvailable = user.availability !== 'Busy';
      
      const years = user.years_of_experience || 3;
      let seniority = 'Mid';
      if (years >= 10) seniority = 'Lead';
      else if (years >= 6) seniority = 'Senior';
      else if (years <= 2) seniority = 'Junior';
      
      const baseRate = 30;
      const expBonus = years * 3;
      const roleBonus = (user.role && (
        user.role.toLowerCase().includes('lead') || 
        user.role.toLowerCase().includes('manager') ||
        user.role.toLowerCase().includes('senior')
      )) ? 20 : 0;
      const costPerHour = baseRate + expBonus + roleBonus;
      
      const name = user.name || user.display_name || 'Employee ' + (index + 1);
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      
      return {
        id: user._id.toString(),
        name: name,
        role: user.role || user.team || 'Developer',
        avatar: initials,
        availability: isAvailable,
        hours_per_week: user.capacity_hours_per_sprint || 40,
        workload: {
          active_tickets: Math.floor(workloadScore * 5),
          ticket_weights: [],
          computed_score: workloadScore
        },
        tech_stack: user.skills || [],
        seniority: seniority,
        efficiency: user.past_performance_score || 0.85,
        stress: workloadScore * 0.6,
        cost_per_hour: costPerHour,
        experience: years
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
  }
});

/**
 * GET /api/smart-allocate/tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const Task = require('../models/Task');
    const tasks = await Task.find({}).lean();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/smart-allocate/allocations
 */
router.post('/allocations', async (req, res) => {
  try {
    const { allocations } = req.body;
    const mongoose = require('mongoose');
    
    if (allocations && allocations.length > 0) {
      await mongoose.connection.db.collection('allocations').insertMany(
        allocations.map(a => ({ ...a, allocated_at: new Date() }))
      );
    }
    res.status(201).json({ success: true, count: allocations?.length || 0 });
  } catch (error) {
    console.error('Error saving allocations:', error);
    res.status(500).json({ error: 'Failed to save allocations' });
  }
});

/**
 * PATCH /api/smart-allocate/employees/:id/workload
 */
router.patch('/employees/:id/workload', async (req, res) => {
  try {
    const { id } = req.params;
    const { workload } = req.body;
    
    // Convert workload score back to free_slots_per_week
    const freeSlots = Math.round((1 - workload) * 40);
    
    const user = await User.findByIdAndUpdate(
      id,
      { free_slots_per_week: freeSlots },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating workload:', error);
    res.status(500).json({ error: 'Failed to update workload' });
  }
});

/**
 * POST /api/smart-allocate/employees
 */
router.post('/employees', async (req, res) => {
  try {
    const employeeData = req.body;
    
    // Map EmployeeData format to User model
    const user = new User({
      user_id: `manual:${Date.now()}`,
      employee_id: employeeData.id || `EMP${Date.now()}`,
      name: employeeData.name,
      role: 'Developer', // Default, main server uses enum
      team: employeeData.role,
      skills: employeeData.tech_stack || [],
      years_of_experience: employeeData.experience || 3,
      free_slots_per_week: Math.round((1 - (employeeData.workload?.computed_score || 0.5)) * 40),
      availability: employeeData.availability ? 'Free' : 'Busy',
      past_performance_score: employeeData.efficiency || 0.85,
      capacity_hours_per_sprint: employeeData.hours_per_week || 40
    });
    
    await user.save();
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

/**
 * GET /api/smart-allocate/stats
 * Returns statistics about employees in the database
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const availableUsers = await User.countDocuments({ availability: { $ne: 'Busy' } });
    const avgExperience = await User.aggregate([
      { $group: { _id: null, avgExp: { $avg: '$years_of_experience' } } }
    ]);

    res.json({ 
      success: true, 
      total: totalUsers,
      available: availableUsers,
      avgExperience: avgExperience[0]?.avgExp || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/smart-allocate/health
 */
router.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

module.exports = router;
