import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in app:', error, info.componentStack)
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
        </div>
      )
    }
    return this.props.children
  }
}
