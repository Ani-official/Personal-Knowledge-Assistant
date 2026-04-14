export default function Footer() {
  return (
    <footer className="px-4 pb-12 pt-6 sm:px-6">
      <div className="premium-panel mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <div className="font-semibold text-foreground">EvidentiaAI</div>
          <p className="mt-2 max-w-md leading-6">
            A premium RAG workspace for asking better questions and getting answers grounded in the files you provide.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/terms" className="transition-colors hover:text-foreground">Terms</a>
          <a href="/privacy" className="transition-colors hover:text-foreground">Privacy</a>
        </div>
        <p>© {new Date().getFullYear()} EvidentiaAI. All rights reserved.</p>
      </div>
    </footer>
  )
}
