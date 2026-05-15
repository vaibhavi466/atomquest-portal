export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
        <p className="text-slate-500 mt-2">You don't have permission to view this page.</p>
        <a href="/login" className="text-blue-600 text-sm mt-4 inline-block hover:underline">
          Return to login
        </a>
      </div>
    </div>
  )
}