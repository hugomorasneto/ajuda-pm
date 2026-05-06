import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getPlanningPokerSessionByInviteCode } from '../services/planningPokerService'

function normalizeInviteCode(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

function PlanningPokerJoinPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [searchParams] = useSearchParams()
  const codeFromUrl = useMemo(() => normalizeInviteCode(searchParams.get('codigo')), [searchParams])
  const [inviteCode, setInviteCode] = useState(() => codeFromUrl)
  const [message, setMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Roda da Fogueira',
      title: 'Entrar por código',
      pills: [{ text: 'Convite' }, { text: 'Projeto protegido' }],
    })

    return () => setTopbarStatus(null)
  }, [setTopbarStatus])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    const safeInviteCode = normalizeInviteCode(inviteCode)
    if (!safeInviteCode) {
      setMessage('Informe o código da sala para entrar na Roda.')
      return
    }

    setInviteCode(safeInviteCode)
    setIsSearching(true)

    const response = await getPlanningPokerSessionByInviteCode({
      inviteCode: safeInviteCode,
      userId,
    })

    setIsSearching(false)

    if (!response.success || !response.data) {
      setMessage('Não encontramos uma Roda acessível com esse código. Confirme o código ou peça acesso ao projeto.')
      return
    }

    navigate(`/projetos/${response.data.project_id}/roda/${response.data.id}`)
  }

  return (
    <div className="projects-page planning-poker-join">
      <section className="panel projects-page__hero planning-poker-join__hero">
        <div className="planning-poker-join__copy">
          <p className="projects-page__eyebrow">Roda da Fogueira</p>
          <h1>Entrar por código</h1>
          <p>
            Cole o código enviado pelo facilitador para acessar a sala de estimativa. Nesta versão, você precisa estar
            cadastrado e ter acesso ao projeto da Roda.
          </p>
        </div>

        <form className="planning-poker-join__form" onSubmit={handleSubmit}>
          <label className="projects-page__field">
            <span>Código da sala</span>
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(normalizeInviteCode(event.target.value))}
              placeholder="Ex.: 136CE7AB2E"
              autoComplete="off"
              className="planning-poker-join__code-input"
              disabled={isSearching}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={isSearching}>
            {isSearching ? 'Buscando Roda...' : 'Entrar na Roda'}
          </button>

          {message ? <p className="projects-page__message">{message}</p> : null}
        </form>
      </section>

      <section className="panel planning-poker-join__notes" aria-label="Como funciona o convite">
        <div>
          <p className="projects-page__eyebrow">Convite protegido</p>
          <h2>O código abre a sala certa, sem expor votos</h2>
          <p>
            O código identifica a Roda, mas os dados continuam protegidos pelas permissões do projeto. Se o acesso não
            estiver liberado, peça ao responsável para adicionar seu e-mail ao projeto.
          </p>
        </div>
        <Link className="btn btn-secondary btn-small" to="/projetos">
          Ver projetos
        </Link>
      </section>
    </div>
  )
}

export default PlanningPokerJoinPage
