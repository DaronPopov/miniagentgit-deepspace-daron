import { useState } from 'react'
import { SiteIcon } from '../../product-site/components/site-icon'
import { copyCommand } from './clipboard'

export function CodePanel({
  id,
  title,
  command,
}: {
  readonly id: string
  readonly title: string
  readonly command: string
}) {
  const [status, setStatus] = useState<
    'idle' | 'copying' | 'copied' | 'failed'
  >('idle')
  async function copy() {
    setStatus('copying')
    setStatus(await copyCommand(command))
  }
  return (
    <figure className="docs-code" aria-labelledby={`${id}-caption`}>
      <figcaption id={`${id}-caption`}>
        <span className="site-icon-label">
          <SiteIcon name="api" />
          {title}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={status === 'copying'}
          aria-label={`Copy command: ${title}`}
          aria-describedby={`${id}-status`}
        >
          {status === 'copied' ? 'Copied' : 'Copy command'}
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={`${title} command`}>
        <code>{command}</code>
      </pre>
      <p
        id={`${id}-status`}
        className="docs-copy-status"
        role="status"
        aria-live="polite"
      >
        {status === 'copied'
          ? 'Command copied.'
          : status === 'failed'
            ? 'Clipboard unavailable. Select and copy the command manually.'
            : status === 'copying'
              ? 'Copying…'
              : ''}
      </p>
    </figure>
  )
}
