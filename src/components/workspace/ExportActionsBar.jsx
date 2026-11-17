import { useCopy } from '../../i18n/context'
import { useState } from 'react'
import {
  buildStoryJiraLike,
  buildStoryMarkdown,
  copyTextToClipboard,
} from '../../utils/storyExport'

function ExportActionsBar({ story, onCopyPlain, plainCopyMessage, isCopyingPlain }) {
  const t = useCopy('forge')
  const storyFormat = useCopy('storyFormat')
  const [exportMessage, setExportMessage] = useState('')
  const [isCopyingMarkdown, setIsCopyingMarkdown] = useState(false)
  const [isCopyingJira, setIsCopyingJira] = useState(false)

  async function handleCopyMarkdown() {
    if (!story) return

    setIsCopyingMarkdown(true)
    try {
      await copyTextToClipboard(buildStoryMarkdown(story, storyFormat))
      setExportMessage('markdown_artifact_copied_review_the_formatting')
    } catch (error) {
      setExportMessage('could_not_copy_as_markdown_try')
      console.error('Falha ao copiar exportação em Markdown:', error)
    } finally {
      setIsCopyingMarkdown(false)
    }
  }

  async function handleCopyJira() {
    if (!story) return

    setIsCopyingJira(true)
    try {
      await copyTextToClipboard(buildStoryJiraLike(story, storyFormat))
      setExportMessage('jira_text_copied_review_it_before')
    } catch (error) {
      setExportMessage('could_not_copy_jira_text_try')
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
          {isCopyingMarkdown ? t('copying_artifact') : t('copy_markdown_artifact')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={handleCopyJira}
          disabled={!story || isCopyingJira}
        >
          {isCopyingJira ? t('copying_artifact') : t('copy_jira_artifact')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={onCopyPlain}
          disabled={!story || isCopyingPlain}
        >
          {isCopyingPlain ? t('copying_artifact') : t('copy_artifact')}
        </button>
      </div>

      {plainCopyMessage ? <p className="copy-message">{plainCopyMessage}</p> : null}
      {exportMessage ? <p className="copy-message">{t(exportMessage)}</p> : null}
    </>
  )
}

export default ExportActionsBar
