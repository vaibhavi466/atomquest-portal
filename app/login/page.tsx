"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
      return
    }

    // Redirect based on role — middleware will handle it
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-4 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">GoalTrack</h1>
          <p className="text-sm text-slate-500 mt-1">In-House Goal Setting & Tracking Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Use your organization credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials for judges */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Demo credentials</p>
            <div className="space-y-1">
              {[
                { role: "Employee", email: "employee@demo.com" },
                { role: "Manager", email: "manager@demo.com" },
                { role: "Admin", email: "admin@demo.com" },
              ].map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => { setEmail(cred.email); setPassword("Demo@123") }}
                  className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-slate-100 transition-colors flex justify-between"
                >
                  <span className="text-slate-600">{cred.role}</span>
                  <span className="text-slate-400">{cred.email}</span>
                </button>
              ))}
              <p className="text-xs text-slate-400 mt-2 text-center">Click any role to auto-fill</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}