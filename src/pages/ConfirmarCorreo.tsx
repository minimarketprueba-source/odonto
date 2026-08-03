
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';


export default function ConfirmarCorreo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const email = searchParams.get('email');
    if (!token || type !== 'email_confirm' || !email) {
      setStatus('error');
      setMessage('Enlace inválido o incompleto.');
      return;
    }
    const confirmar = async () => {
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: 'email',
        email,
      });
      if (error) {
        setStatus('error');
        setMessage('No se pudo confirmar el correo: ' + error.message);
      } else {
        setStatus('success');
        setMessage('¡Correo confirmado correctamente! Redirigiendo al dashboard...');
        setTimeout(() => {
          navigate('/');
        }, 2500);
      }
    };
    confirmar();
  }, [searchParams, navigate]);

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 32, textAlign: 'center' }}>
      <h2>Confirmación de correo</h2>
      {status === 'pending' && <p>Confirmando...</p>}
      {status !== 'pending' && <p>{message}</p>}
    </div>
  );
}
