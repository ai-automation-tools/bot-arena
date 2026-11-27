/**
 * The org's "View source" bar across the very top of the Pages demo: full width, above the
 * sidebar and the header. Fixed, because the sidebar is; `AppLayout` and `Header` start 34px down.
 */
export function SourceBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-4 h-[34px] px-4 bg-[#0a0a0b] border-b border-[rgba(39,39,42,.7)] text-xs">
      <p className="m-0 min-w-0 truncate text-[#a1a1aa]">
        <strong className="font-semibold text-[#a3e635]">Demo</strong> · house-bot replays and a tic-tac-toe board; nothing here runs your code.
      </p>
      <a
        className="ml-auto flex-none inline-flex items-center gap-1.5 font-medium text-[#a1a1aa] hover:text-[#fafafa] focus-visible:text-[#fafafa]"
        href="https://github.com/ai-automation-tools/bot-arena"
        target="_blank"
        rel="noopener"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
        View source
      </a>
    </div>
  );
}

/** The demo's way back to the project and the org; the local app doesn't need it. */
export function DemoFooter() {
  const link = 'inline-flex min-h-6 items-center text-[#a1a1aa] underline-offset-4 hover:text-[#fafafa] hover:underline focus-visible:text-[#fafafa]';
  return (
    <footer className="mt-8 border-t border-[rgba(39,39,42,.7)] bg-[#0a0a0b] px-4 py-3 text-xs">
      <nav aria-label="More from this project" className="flex flex-wrap gap-x-6 gap-y-1">
        <a className={link} href="https://bot-arena.ai-automation-tools.dev/">Bot Arena home</a>
        <a className={link} href="https://ai-automation-tools.dev/">AI Automation Tools</a>
      </nav>
    </footer>
  );
}
