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

  handleHardReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
    } catch (e) {
      console.error('Error limpiando cache', e);
    }
    window.location.reload(true);
  };

  handleReportSupport = () => {
    const errorDetails = `🚨 *Reporte de Error - Fast Food* 🚨\n\n*Error:*\n${this.state.error?.toString() || 'Desconocido'}\n\n*InfoStack:*\n${this.state.errorInfo?.componentStack?.substring(0, 500) || 'Sin info adicional'}`;
    const waUrl = `https://wa.me/584246603660?text=${encodeURIComponent(errorDetails)}`; // Placeholder phone number
    window.open(waUrl, '_blank');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#ffebee', minHeight: '100vh', color: '#b71c1c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, borderBottom: '2px solid #ffcdd2', paddingBottom: '10px' }}>Algo salió mal (Error del Sistema)</h2>
            <p style={{ color: '#555', fontSize: '14px' }}>La aplicación encontró un problema crítico. Intenta recargar la página limpiando el caché.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button 
                onClick={this.handleHardReload} 
                style={{ flex: 1, padding: '12px 20px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Recargar y Limpiar Caché
              </button>
              
              <button 
                onClick={this.handleReportSupport} 
                style={{ flex: 1, padding: '12px 20px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Reportar por WhatsApp
              </button>
            </div>

            <details style={{ whiteSpace: 'pre-wrap', marginTop: '30px', background: '#f5f5f5', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #ddd' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>Ver detalles técnicos del error</summary>
              <div style={{ marginTop: '10px', overflowX: 'auto' }}>
                <strong>{this.state.error && this.state.error.toString()}</strong>
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
