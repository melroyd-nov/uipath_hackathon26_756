export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Call Center Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
