import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login falhou');
        return;
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      navigate('/');
    } catch (err) {
      setError('Erro ao conectar ao servidor');
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>AutoPlan</h1>
        <h2 style={styles.subtitle}>Login</h2>
        
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              style={styles.input} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu@email.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              style={styles.input} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••"
            />
          </div>
          <button type="submit" style={styles.loginBtn}>Entrar</button>
        </form>

        <p style={styles.footer}>
          Não tem conta? Solicite ao administrador a criação do seu usuário.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    backgroundColor: '#f0f2f5' 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: '40px', 
    borderRadius: '15px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
    width: '100%', 
    maxWidth: '400px',
    textAlign: 'center'
  },
  title: { 
    color: '#1a73e8', 
    margin: '0 0 10px 0', 
    fontSize: '32px' 
  },
  subtitle: { 
    color: '#666', 
    margin: '0 0 30px 0',
    fontSize: '24px'
  },
  form: { 
    display: 'flex', 
    flexDirection: 'column' 
  },
  formGroup: { 
    marginBottom: '20px', 
    display: 'flex', 
    flexDirection: 'column',
    textAlign: 'left'
  },
  input: { 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid #ddd', 
    fontSize: '16px',
    marginTop: '8px'
  },
  loginBtn: { 
    padding: '12px', 
    backgroundColor: '#1a73e8', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'background-color 0.3s'
  },
  error: { 
    backgroundColor: '#ffebee', 
    color: '#c62828', 
    padding: '12px', 
    borderRadius: '8px', 
    marginBottom: '20px',
    fontSize: '14px'
  },
  footer: {
    color: '#666',
    fontSize: '14px',
    marginTop: '20px'
  },
  link: {
    color: '#1a73e8',
    textDecoration: 'none',
    fontWeight: 'bold'
  }
};

export default Login;
