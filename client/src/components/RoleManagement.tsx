import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const API = "/api"

interface User {
  _id: string
  user_id: string
  source: string
  source_user_id: string
  display_name: string
  email?: string
  role: string
  department?: string
  team?: string
  salary_band?: string
  hourly_rate?: number
  employment_type: string
  skills: string[]
  seniority_level: number
}

interface RoleConfig {
  roles: string[]
  departments: string[]
  employmentTypes: string[]
  seniorityLevels: number[]
}

export function RoleManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [config, setConfig] = useState<RoleConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [filterRole, setFilterRole] = useState<string>("")
  const [filterDepartment, setFilterDepartment] = useState<string>("")
  const [message, setMessage] = useState<string | null>(null)

  // Fetch config and users
  useEffect(() => {
    Promise.all([
      fetch(`${API}/roles/config`).then(r => r.json()),
      fetch(`${API}/roles/users`).then(r => r.json())
    ])
      .then(([configData, usersData]) => {
        setConfig(configData)
        setUsers(usersData.users || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch data:", err)
        setLoading(false)
      })
  }, [])

  const fetchUsers = async () => {
    const params = new URLSearchParams()
    if (filterRole) params.set("role", filterRole)
    if (filterDepartment) params.set("department", filterDepartment)
    
    const res = await fetch(`${API}/roles/users?${params.toString()}`)
    const data = await res.json()
    setUsers(data.users || [])
  }

  useEffect(() => {
    if (!loading) {
      fetchUsers()
    }
  }, [filterRole, filterDepartment])

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const res = await fetch(`${API}/roles/users/${encodeURIComponent(userId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Updated ${data.user?.display_name || userId}`)
        setEditingUser(null)
        fetchUsers()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage("Failed to update user")
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const autoAssignRoles = async () => {
    try {
      setMessage("Auto-assigning roles...")
      const res = await fetch(`${API}/roles/auto-assign`, { method: "POST" })
      const data = await res.json()
      setMessage(`Auto-assigned ${data.assignments?.length || 0} users`)
      fetchUsers()
    } catch (err) {
      setMessage("Auto-assign failed")
    }
    setTimeout(() => setMessage(null), 5000)
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl">
        <p className="text-muted-foreground">Loading role management...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Role Management</h2>
        <Button onClick={autoAssignRoles} variant="outline">
          Auto-Assign Roles
        </Button>
      </div>

      {message && (
        <div className="rounded-lg bg-muted px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm text-muted-foreground">Filter by Role</label>
          <select 
            className="w-full mt-1 rounded-md border bg-background px-3 py-2"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            {config?.roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm text-muted-foreground">Filter by Department</label>
          <select 
            className="w-full mt-1 rounded-md border bg-background px-3 py-2"
            value={filterDepartment}
            onChange={e => setFilterDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {config?.departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">User</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Source</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Role</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Department</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Seniority</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No users found. Connect GitHub or Jira to sync users.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.user_id} className="border-t">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{user.display_name || user.user_id}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.source === 'GitHub' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingUser?.user_id === user.user_id ? (
                      <select 
                        className="rounded border bg-background px-2 py-1 text-sm"
                        value={editingUser.role}
                        onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                      >
                        {config?.roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-sm ${user.role === 'Unassigned' ? 'text-orange-600' : ''}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser?.user_id === user.user_id ? (
                      <select 
                        className="rounded border bg-background px-2 py-1 text-sm"
                        value={editingUser.department || ''}
                        onChange={e => setEditingUser({...editingUser, department: e.target.value})}
                      >
                        <option value="">Select...</option>
                        {config?.departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {user.department || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser?.user_id === user.user_id ? (
                      <select 
                        className="rounded border bg-background px-2 py-1 text-sm w-16"
                        value={editingUser.seniority_level}
                        onChange={e => setEditingUser({...editingUser, seniority_level: parseInt(e.target.value)})}
                      >
                        {[1,2,3,4,5].map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">L{user.seniority_level}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser?.user_id === user.user_id ? (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateUser(user.user_id, {
                            role: editingUser.role,
                            department: editingUser.department,
                            seniority_level: editingUser.seniority_level
                          })}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingUser(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingUser({...user})}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold">{users.length}</div>
          <div className="text-sm text-muted-foreground">Total Users</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold">
            {users.filter(u => u.role !== 'Unassigned').length}
          </div>
          <div className="text-sm text-muted-foreground">Assigned Roles</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold text-orange-600">
            {users.filter(u => u.role === 'Unassigned').length}
          </div>
          <div className="text-sm text-muted-foreground">Unassigned</div>
        </div>
      </div>
    </div>
  )
}
