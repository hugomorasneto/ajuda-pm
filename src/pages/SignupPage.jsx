import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { APP_NAME } from '../constants/app'

function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setInfoMessage('')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      navigate('/tool', { replace: true })
      return
    }

    setInfoMessage('Cadastro realizado. Verifique seu email para confirmar a conta.')
    setIsSubmitting(false)
  }

  return (
    <div className="page auth-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Cadastro</p>
        <h1>Criar conta no {APP_NAME}</h1>
        <p className="auth-description">Tenha historico proprio e uso individual da ferramenta.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {infoMessage ? <p className="auth-info">{infoMessage}</p> : null}

        <p className="auth-switch">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </div>
  )
}

export default SignupPage

