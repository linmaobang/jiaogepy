import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || '页面遇到了一点小问题',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] px-6">
          <div className="max-w-md w-full bg-white border border-[#e4e2dc] rounded-2xl p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-[#1a211c] mb-3">
              小花园暂时打了个盹
            </h2>
            <p className="text-sm text-[#5d675f] mb-6 leading-relaxed">
              刷新一下页面即可恢复，刚才的浇水记录不会丢失。
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#15803d] text-white text-sm font-medium hover:bg-[#166534] transition-colors whitespace-nowrap"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
