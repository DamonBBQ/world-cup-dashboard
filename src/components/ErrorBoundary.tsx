import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 模块加载失败:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F0EB] px-4">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h1 className="text-lg font-bold text-[#183D2B]">页面模块加载失败</h1>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              页面在渲染过程中遇到错误，请查看浏览器控制台获取详细错误信息。
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2 mb-4 overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2 bg-[#183D2B] text-white rounded-lg text-sm font-medium hover:bg-[#1a4d35] transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
