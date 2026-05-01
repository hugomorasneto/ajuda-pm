import { useState } from 'react'
import {
  buildStoryJiraLike,
  buildStoryMarkdown,
  copyTextToClipboard,
} from '../../utils/storyExport'

function ExportActionsBar({ story, onCopyPlain, plainCopyMessage, isCopyingPlain }) {
  const [exportMessage, setExportMessage] = useState('')
  const [isCopyingMarkdown, setIsCopyingMarkdown] = useState(false)
  const [isCopyingJira, setIsCopyingJira] = useState(false)

  async function handleCopyMarkdown() {
    if (!story) return

    setIsCopyingMarkdown(true)
    try {
      await copyTextToClipboard(buildStoryMarkdown(story))
      setExportMessage('Markdown copiado. Revise a formatação antes de colar no backlog.')
    } catch (error) {
      setExportMessage('Não foi possível copiar em Markdown agora.')
      console.error('Falha ao copiar exportação em Markdown:', error)
    } finally {
      setIsCopyingMarkdown(false)
    }
  }

  async function handleCopyJira() {
    if (!story) return

    setIsCopyingJira(true)
    try {
      await copyTextToClipboard(buildStoryJiraLike(story))
      setExportMessage('Formato Jira copiado. Revise o texto antes de enviar para a issue.')
    } catch (error) {
      setExportMessage('Não foi possível copiar no formato Jira agora.')
      console.error('Falha ao copiar exportação em formato Jira:', error)
    } finally {
      setIsCopyingJira(false)
    }
  }

  return (
    <>
      <div className="export-actions__buttons">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={handleCopyMarkdown}
          disabled={!story || isCopyingMarkdown}
        >
          {isCopyingMarkdown ? 'Copiando...' : 'Copiar em Markdown'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={handleCopyJira}
          disabled={!story || isCopyingJira}
        >
          {isCopyingJira ? 'Copiando...' : 'Copiar no formato Jira'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={onCopyPlain}
          disabled={!story || isCopyingPlain}
        >
          {isCopyingPlain ? 'Copiando...' : 'Copiar texto simples'}
        </button>
      </div>

      {plainCopyMessage ? <p className="copy-message">{plainCopyMessage}</p> : null}
      {exportMessage ? <p className="copy-message">{exportMessage}</p> : null}
    </>
  )
}

export default ExportActionsBar
