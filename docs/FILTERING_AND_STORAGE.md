# Freshservice Dashboard - Filtering & Storage Documentation

## Ticket Fetching Strategy

### Optimized API Calls Based on Time Period

| Time Period | Max Pages | Max Tickets | Cache TTL | Date Filter |
|-------------|-----------|-------------|-----------|-------------|
| Today | 5 | 500 | 2 minutes | Last 24 hours |
| This Week | 10 | 1,000 | 5 minutes | Last 7 days |
| This Month | 20 | 2,000 | 10 minutes | From 1st of month |
| This Quarter | 40 | 4,000 | 30 minutes | From current quarter start |
| Q1-Q4 | 40 | 4,000 | 30 minutes | From Jan 1st of current year |

### Smart Caching Strategy
- Each time period has its own cache key: `tickets_{timeRange}_{agentId}_{year}`
- Cache TTL varies based on how frequently data changes
- Quarter data is cached for 30 minutes to reduce API load
- Today's data refreshes every 2 minutes for real-time updates

## Filtering & Exclusions

### 1. Workspace Filtering
- **Primary**: Filters to workspace ID 2 (IT Support)
- **Fallback**: If workspace 2 doesn't exist, uses workspace 1
- **Single Workspace**: If only one workspace exists, uses all tickets
- **Impact**: Can exclude 50%+ of tickets if multiple workspaces exist

### 2. Onboarding/Offboarding Exclusions
Automatically excludes tickets with these keywords in subject or tags:
- "onboarding"
- "offboarding" 
- "new hire"
- "new starter"
- "termination"
- "leaving"
- "exit"

**Impact**: Typically removes 100-200 tickets from the dataset

### 3. Time Range Filtering
- Filters by `created_at` date
- Business quarters properly defined:
  - Q1: January - March
  - Q2: April - June
  - Q3: July - August
  - Q4: October - December

### 4. Optional Filters
- **Agent Filter**: Filter by specific responder ID
- **Priority Filter**: Filter by priority levels (1-4)
- **Status Filter**: Filter by status codes

## Rate Limiting Considerations
- PRO Plan: 120 API calls per minute
- Each page fetch counts as 1 API call
- Additional calls for conversations (response time calculations)
- Smart pagination prevents unnecessary API calls

## Storage Limitations

### Current In-Memory Storage
- No hard limit on ticket count
- Practical limit: ~10,000 tickets before memory issues
- No persistence between sessions
- All data lost on page refresh

### When to Consider a Database
1. **Ticket Volume**: >10,000 tickets
2. **Historical Data**: Need data beyond API retention
3. **Performance**: Faster queries without API limits
4. **Multi-User**: Multiple concurrent dashboard users
5. **Custom Analytics**: Complex queries and aggregations

### Recommended Database Options
- **SQLite**: Simple, file-based, good for <100k tickets
- **PostgreSQL**: Full relational features, best for scale
- **Redis**: Fast caching with persistence option
- **TimescaleDB**: Optimized for time-series data

## API Data Coverage
- Freshservice API returns tickets based on `updated_since` parameter
- We fetch all tickets from January 1st for Q1-Q4 views
- Recent data (today/week/month) uses targeted date filters
- Pagination automatically adjusts based on actual ticket count