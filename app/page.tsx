import { AuthGuard } from './components/AuthGuard'
import { OptimizedLayout } from './components/OptimizedLayout'
import { Overview } from './components/Overview'

export default function Home() {
  return (
    <AuthGuard>
      <OptimizedLayout>
        <Overview />
      </OptimizedLayout>
    </AuthGuard>
  )
} 