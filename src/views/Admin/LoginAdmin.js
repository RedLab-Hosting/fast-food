import React, { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function LoginAdmin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Verificar que sea admin
      const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (userDoc.exists() && userDoc.data().rol === 'admin') {
        onLogin(cred.user);
      } else {
        setError('No tienes permisos de administrador.');
        await auth.signOut();
      }
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    }
    setCargando(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Ingresa tu correo electrónico primero.');
      return;
    }
    setError('');
    setMensaje('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMensaje('Se envió un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError('No se pudo enviar el correo. Verifica que el correo sea correcto.');
    }
  };

  return (
    <div className="min-h-screen bg-kfc-dark flex items-center justify-center p-4 font-sans">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-extrabold text-center mb-2 text-gray-800">🔒 Admin</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Panel de Administración</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 font-medium">
            {mensaje}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full mt-6 bg-kfc-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors shadow-sm"
        >
          {cargando ? 'Entrando...' : 'Iniciar Sesión'}
        </button>

        <button
          type="button"
          onClick={handleResetPassword}
          className="w-full mt-3 text-kfc-red text-sm font-medium hover:underline bg-transparent border-none cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  );
}

export default LoginAdmin;
