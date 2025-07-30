import { AuthGuard } from '../components/AuthGuard'
import { OptimizedLayout } from '../components/OptimizedLayout'
import { AgentPerformance } from '../components/AgentPerformance'

export default function AgentsPage() {
  return (
    <AuthGuard>
      <OptimizedLayout>
        <AgentPerformance />
      </OptimizedLayout>
    </AuthGuard>
  )
} 