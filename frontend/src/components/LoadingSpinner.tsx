export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-slate-600 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )
}
