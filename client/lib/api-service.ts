import { EmployeeData, LLMAllocationResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/smart-allocate';

// Fetch employees from MongoDB via API
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
