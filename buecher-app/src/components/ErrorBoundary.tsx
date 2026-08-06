import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  componentStack: string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in app:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
          <p className="font-serif text-xl">Etwas ist schiefgelaufen</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
            Deine Bücher sind sicher gespeichert. Ein Neuladen behebt das meistens.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2.5 font-medium"
          >
            Neu laden
          </button>
          <pre className="mt-4 max-w-full w-full max-h-64 overflow-auto text-left text-[11px] leading-snug bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-md p-3 whitespace-pre-wrap break-words">
            {this.state.error.name}: {this.state.error.message}
            {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
            {this.state.componentStack ? `\n\nComponent-Stack:${this.state.componentStack}` : ''}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
