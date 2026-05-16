"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, UserCog } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    "bg-purple-100 text-purple-700",
  MANAGER:  "bg-blue-100 text-blue-700",
  EMPLOYEE: "bg-slate-100 text-slate-600",
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", password: "Demo@123",
    role: "EMPLOYEE", department: "", managerId: "",
  })

  const fetchUsers = () => {
    axios.get("/api/admin/users").then((res) => {
      setUsers(res.data)
      setLoading(false)
    })
  }

  useEffect(() => { fetchUsers() }, [])

  const managers = users.filter((u) => u.role === "MANAGER")

  async function handleCreate() {
    setSaving(true)
    try {
      await axios.post("/api/admin/users", form)
      fetchUsers()
      setShowCreate(false)
      setForm({ name: "", email: "", password: "Demo@123", role: "EMPLOYEE", department: "", managerId: "" })
      toast.success("User created", { description: `${form.name} added successfully.` })
    } catch (err: any) {
      toast.error("Failed", { description: err.response?.data?.error || "Error creating user" })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editUser) return
    setSaving(true)
    try {
      await axios.patch(`/api/admin/users/${editUser.id}`, editUser)
      fetchUsers()
      setEditUser(null)
      toast.success("User updated")
    } catch {
      toast.error("Update failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Loading users...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1 text-sm">{users.length} users in the system</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} className="mr-1.5" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["User", "Role", "Department", "Manager", "Goals", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-slate-500 px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-slate-100">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{user.department || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{user.manager?.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{user._count?.goals ?? 0}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-slate-700"
                      onClick={() => setEditUser({ ...user })}
                    >
                      <UserCog size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "e.g. Amit Sharma" },
              { label: "Email", key: "email", type: "email", placeholder: "amit@company.com" },
              { label: "Password", key: "password", type: "text", placeholder: "Demo@123" },
              { label: "Department", key: "department", type: "text", placeholder: "e.g. Sales" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "EMPLOYEE" && managers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Assign Manager</Label>
                <Select
                  value={form.managerId}
                  onValueChange={(v) => setForm({ ...form, managerId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input
                  value={editUser.department || ""}
                  onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(v) => setEditUser({ ...editUser, role: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editUser.role === "EMPLOYEE" && (
                <div className="space-y-1.5">
                  <Label>Manager</Label>
                  <Select
                    value={editUser.managerId || ""}
                    onValueChange={(v) => setEditUser({ ...editUser, managerId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                    <SelectContent>
                      {managers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}