import { useState } from 'react'
import { CodePanel } from '../onboarding/components/code-panel'
import { commandExample, setupCommand } from '../onboarding/examples/commands'
import { httpExamples } from '../onboarding/examples/requests'
import type { ShellMode } from '../onboarding/contracts/documentation'
import { onboardingCopy } from './content'

const identity = httpExamples.find((example) => example.id === 'identity')
if (!identity) throw new Error('Missing verified identity example')
const identityExample = identity

export function HttpSetup() {
  const [shell, setShell] = useState<ShellMode>('powershell')
  const mode =
    shell === 'powershell'
      ? 'Windows PowerShell 5.1+'
      : 'PowerShell 7.3+ on Windows · curl.exe 7.76+'
  const command =
    setupCommand(shell) +
    '\n\n' +
    commandExample(identityExample, shell).command
  return (
    <div className="agent-http">
      <h3>Configure and verify</h3>
      <p>{onboardingCopy.setupNote}</p>
      <fieldset className="agent-shell">
        <legend>Command mode</legend>
        {(['powershell', 'curl'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="agent-shell"
              checked={shell === value}
              onChange={() => setShell(value)}
            />
            {value === 'powershell'
              ? 'Windows PowerShell'
              : 'curl.exe in PowerShell'}
          </label>
        ))}
      </fieldset>
      <p className="site-small site-muted">
        {mode}. curl.exe commands use PowerShell syntax, not Bash or cmd.exe.
      </p>
      <CodePanel
        key={shell}
        id="agent-identity"
        title={`Verify identity · ${mode}`}
        command={command}
      />
      <p className="site-small site-muted">{onboardingCopy.credentialNote}</p>
      <a
        className="site-button site-button-secondary"
        href={`/docs#mode-${shell}`}
      >
        Continue with repository, commit and CI examples
      </a>
    </div>
  )
}
