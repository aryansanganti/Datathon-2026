const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function fetchTeams() {
  const res = await fetch(`${API_BASE}/tasks/teams`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function fetchEmployees() {
  const res = await fetch(`${API_BASE}/tasks/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/tasks/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function allocateTask(taskDescription: string, taskType?: string) {
  const res = await fetch(`${API_BASE}/tasks/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_description: taskDescription,
      task_type: taskType || undefined
    })
  });
  if (!res.ok) throw new Error('Failed to allocate task');
  return res.json();
}
