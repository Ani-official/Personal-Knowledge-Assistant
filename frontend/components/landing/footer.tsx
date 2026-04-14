export default function Footer() {
  return (
    <footer className="border-t border-border/60 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground">
          <span className="text-primary">Know</span>AI
        </div>
        <p>© {new Date().getFullYear()} KnowAI. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
        </div>
      </div>
    </footer>
  )
}
