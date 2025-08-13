import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Minimal subset of dashboard context to keep tokens low
interface DashboardContextSummary {
  filters?: any
  stats?: any
  topIssues?: Array<{ name: string; value: number }>
  workload?: Array<{ name: string; value: number }>
  periodLabel?: string
  agentScope?: string
}

function getPeriodLabel(timeRange: string | undefined): string {
  switch (timeRange) {
    case 'today':
      return 'today'
    case 'week':
      return 'the last 7 days'
    case 'month':
      return 'the last 4 weeks'
    case 'quarter':
      return 'this quarter'
    case 'q1':
      return 'Q1 (Jan–Mar)'
    case 'q2':
      return 'Q2 (Apr–Jun)'
    case 'q3':
      return 'Q3 (Jul–Sep)'
    case 'q4':
      return 'Q4 (Oct–Dec)'
    default:
      return 'the selected period'
  }
}

function summarizeDashboardContext(context: any, filters: any): DashboardContextSummary {
  const stats = context?.stats ? {
    openTickets: context.stats.openTickets,
    resolvedToday: context.stats.resolvedToday,
    slaBreaches: context.stats.slaBreaches,
    unassignedTickets: context.stats.unassignedTickets,
    totalAgents: context.stats.totalAgents,
    resolutionRate: context.stats.resolutionRate,
    avgResolutionTime: context.stats.avgResolutionTime,
    firstCallResolution: context.stats.firstCallResolution,
  } : undefined

  const topIssues = Array.isArray(context?.recurringIssues)
    ? context.recurringIssues
        .slice(0, 8)
        .map((i: any) => ({ name: i.name, value: i.value }))
    : undefined

  const workload = Array.isArray(context?.agentWorkload)
    ? context.agentWorkload.map((w: any) => ({ name: w.name, value: w.value }))
    : undefined

  const periodLabel = getPeriodLabel(filters?.timeRange)
  const agentScope = filters?.agentId && filters.agentId !== 'all' ? `Agent ID ${filters.agentId}` : 'All agents'

  return {
    filters,
    stats,
    topIssues,
    workload,
    periodLabel,
    agentScope,
  }
}

export async function POST(req: NextRequest) {
  try {
    // Support both OPENAI_API_KEY and OPEN_API_KEY per environment naming
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 400 })
    }

    const body = await req.json()
    const messages: ChatMessage[] = body?.messages || []
    const context = body?.context
    const filters = body?.filters

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const contextSummary = summarizeDashboardContext(context, filters)

    const systemPreamble = [
      'You are an IT service desk analytics assistant embedded in a Freshservice dashboard.',
      'All quantities and facts MUST be scoped to the provided filters and periodLabel in context.',
      'Do not use the word "today" unless periodLabel is "today". Refer to the selected period using periodLabel verbatim.',
      'If the agentScope is not "All agents", scope analysis to that agent only.',
      'If a number is not present in context, say it is unknown rather than inventing values.',
      'Answer in clean Markdown with short sections and bullet lists. Use bold for labels only.'
    ].join(' ')

    const guidance = [
      'Format your response with these sections if relevant: **Trends**, **Risks**, **Workload Balance**, **Recommendations**.',
      'Explicitly mention the periodLabel and agentScope in your first sentence.',
    ].join(' ')

    const openaiMessages: ChatMessage[] = [
      { role: 'system', content: `${systemPreamble}\n\n${guidance}\n\nDashboard Context (JSON):\n${JSON.stringify(contextSummary)}` },
      ...messages,
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: 'Upstream error', details: text }, { status: 500 })
    }

    const data = await response.json()
    const reply = data?.choices?.[0]?.message?.content || 'I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}


