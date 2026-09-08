'use client'

import { Component, type ReactNode } from 'react'
import { FallbackPoster } from '@/components/fallback-poster'

type Props = {
  children: ReactNode
  onRetry?: () => void
  /**
   * Shown instead of the default poster. The default is the home page's —
   * cream, and headed "Handcrafted in WebGL" — which is the wrong colour and
   * the wrong words anywhere else.
   */
  fallback?: ReactNode
}

type State = {
  failed: boolean
}

/**
 * Catches GLB fetch/parse failures and anything thrown while building the
 * scene, so a broken asset degrades to the static panel instead of an empty
 * viewport. Error boundaries have no hook equivalent, hence the class.
 */
export class ModelErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  private handleRetry = () => {
    this.setState({ failed: false })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? <FallbackPoster reason="load-failed" onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
