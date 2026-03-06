import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary atrapó un error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#ffebee', minHeight: '100vh', color: '#b71c1c' }}>
          <h2>Algo salió mal (Error del Sistema)</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Ver detalles del error</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <br/>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Recargar Aplicación</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
