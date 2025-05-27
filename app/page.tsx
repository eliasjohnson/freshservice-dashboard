import FastDashboard from './components/FastDashboard'

export default function HomePage() {
  // Fast loading: No server-side data fetching
  // Component will show immediately with skeletons, then load data client-side
  return <FastDashboard />
} 