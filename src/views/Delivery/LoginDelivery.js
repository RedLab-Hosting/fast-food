import React, { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { IconCheckCircle, IconMotorbike } from '../../Components/Icons';

function LoginDelivery({ onLogin }) {
  const [modo, setModo] = useState('login'); // login o registro
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (!userDoc.exists() || userDoc.data().rol !== 'delivery') {
        setError('Esta cuenta no es de repartidor.');
        await auth.signOut();
      } else if (!userDoc.data().aprobado) {
        setError('Tu cuenta aún no ha sido aprobada por el administrador. Espera la confirmación.');
        await auth.signOut();
      } else {
        onLogin(cred.user);
      }
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    }
    setCargando(false);
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Crear perfil en Firestore
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        uid: cred.user.uid,
        email: email,
        nombre: nombre,
        rol: 'delivery',
        disponible: false,
        aprobado: false,
        fecha: serverTimestamp(),
      });
      await auth.signOut();
      setRegistroExitoso(true);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Intenta iniciar sesión.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Error al registrar: ' + err.message);
      }
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

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-gradient-delivery flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl animate-scale animate-fade-in relative z-10">
          <p className="text-5xl mb-4"><IconCheckCircle className="w-12 h-12 text-kfc-red mx-auto" /></p>
          <h2 className="text-2xl font-black text-gray-800 mb-2">¡Ingreso exitoso!</h2>
          <p className="text-gray-500 mb-6 font-medium">Tu solicitud fue enviada. El administrador debe aprobar tu cuenta antes de que puedas iniciar sesión.</p>
          <button
            onClick={() => { setRegistroExitoso(false); setModo('login'); }}
            className="w-full bg-kfc-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-delivery flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-black text-white">Fast Food</h1>
          <p className="text-blue-300 text-sm mt-1">Panel de Repartidores</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-2xl animate-fade-in">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-blue-900 rounded-2xl mx-auto flex items-center justify-center mb-3">
              <IconMotorbike className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-800">
              {modo === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
            </h2>
          </div>

        {/* Toggle Login/Registro */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setModo('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${modo === 'login' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500'
              }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setModo('registro'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${modo === 'registro' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500'
              }`}
          >
            Registrarse
          </button>
        </div>

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

        <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
          <div className="space-y-4">
            {modo === 'registro' && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
                required
              />
            )}
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
            {cargando ? 'Cargando...' : (modo === 'login' ? 'Entrar' : 'Crear Cuenta')}
          </button>

        {modo === 'login' && (
          <button
            type="button"
            onClick={handleResetPassword}
            className="w-full mt-3 text-kfc-red text-sm font-medium hover:underline bg-transparent border-none cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        </form>
      </div>
      </div>
    </div>
  );
}

export default LoginDelivery;
