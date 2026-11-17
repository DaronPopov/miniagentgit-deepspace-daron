import { commitDiagram, ciDiagram, diagramNotes } from '../content/diagrams'
import { LifecycleDiagram } from './lifecycle-diagram'

export function CommitLifecycleDiagram() {
  return (
    <LifecycleDiagram metadata={commitDiagram} note={diagramNotes.commit} />
  )
}
export function CiLifecycleDiagram() {
  return <LifecycleDiagram metadata={ciDiagram} note={diagramNotes.ci} />
}
