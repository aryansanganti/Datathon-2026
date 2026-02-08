import { EmployeeData, LLMAllocationResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/smart-allocate';

// Fetch employees from MongoDB via API (smart-allocate format with JIRA/GitHub data)
export const fetchEmployees = async (): Promise<EmployeeData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/smart-allocate/employees`);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

// Fetch enhanced employees with JIRA and GitHub data
export const fetchEnhancedEmployees = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/smart-allocate/employees-enhanced`);
    if (!response.ok) {
      throw new Error('Failed to fetch enhanced employees');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching enhanced employees:', error);
    throw error;
  }
};

// Fetch JIRA users with tickets
export const fetchJiraUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/users`);
    if (!response.ok) {
      throw new Error('Failed to fetch JIRA users');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching JIRA users:', error);
    throw error;
  }
};

// Fetch combined JIRA + GitHub data
export const fetchJiraCombined = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/combined`);
    if (!response.ok) {
      throw new Error('Failed to fetch combined data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching combined data:', error);
    throw error;
  }
};

// Fetch JIRA stats
export const fetchJiraStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch JIRA stats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching JIRA stats:', error);
    throw error;
  }
};

// Fetch delay prediction data for employees
export const fetchDelayPredictionData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/hr/delay-prediction-data`);
    if (!response.ok) {
      throw new Error('Failed to fetch delay prediction data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching delay prediction data:', error);
    throw error;
  }
};

// Fetch JIRA tasks for allocation
export const fetchJiraTasks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/smart-allocate/jira-tasks`);
    if (!response.ok) {
      throw new Error('Failed to fetch JIRA tasks');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching JIRA tasks:', error);
    throw error;
  }
};

// Fetch combined employees from HR
export const fetchCombinedEmployees = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/hr/employees-combined`);
    if (!response.ok) {
      throw new Error('Failed to fetch combined employees');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching combined employees:', error);
    throw error;
  }
};

// Fetch tasks from MongoDB via API
export const fetchTasks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/smart-allocate/tasks`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

// Save allocation results to MongoDB
export const saveAllocations = async (allocations: LLMAllocationResponse['allocations']) => {
  try {
    const response = await fetch(`${API_BASE_URL}/smart-allocate/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ allocations }),
    });
    if (!response.ok) {
      throw new Error('Failed to save allocations');
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving allocations:', error);
    throw error;
  }
};

// Update employee workload
export const updateEmployeeWorkload = async (employeeId: string, workload: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/workload`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workload }),
    });
    if (!response.ok) {
      throw new Error('Failed to update workload');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating workload:', error);
    throw error;
  }
};

// Create a new employee
export const createEmployee = async (employee: Partial<EmployeeData>) => {
  try {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employee),
    });
    if (!response.ok) {
      throw new Error('Failed to create employee');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

// Seed database with sample data
export const seedDatabase = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/seed`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to seed database');
    }
    return await response.json();
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Fetch recent JIRA activity for dashboard
export const fetchRecentJiraActivity = async (limit: number = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/recent-activity?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch recent JIRA activity');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching recent JIRA activity:', error);
    throw error;
  }
};
