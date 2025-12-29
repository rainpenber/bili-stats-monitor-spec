import React from 'react'
import { Button } from './Button'

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    // 可以在这里把错误上报到监控（预留）
    // console.error('ErrorBoundary caught', error, info)
  }

  onReload = () => {
    // 简单的刷新页面
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="max-w-lg w-full card p-6 text-center space-y-3">
            <div className="text-lg font-semibold">页面出现异常</div>
            <div className="text-sm text-muted-foreground break-words">
              很抱歉，出现了未预期的错误。你可以尝试刷新页面，或稍后再试。
            </div>
            <div className="pt-2">
              <Button onClick={this.onReload}>刷新页面</Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

