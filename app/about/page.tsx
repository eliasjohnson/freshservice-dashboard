import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import Link from 'next/link';
import { ArrowLeft, Calculator, Clock, Users, AlertTriangle, Target, BarChart3, TrendingUp } from 'lucide-react';

export default function AboutMetricsPage() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">About Metrics</h1>
        <p className="text-gray-600">
          Comprehensive guide to understanding how all metrics and calculations work in your Freshservice Dashboard.
        </p>
      </div>

      {/* Table of Contents */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Quick Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <a href="#ticket-status" className="text-blue-600 hover:underline">Ticket Status</a>
            <a href="#agent-workload" className="text-blue-600 hover:underline">Agent Workload</a>
            <a href="#sla-metrics" className="text-blue-600 hover:underline">SLA Metrics</a>
            <a href="#time-calculations" className="text-blue-600 hover:underline">Time Calculations</a>
            <a href="#filtering" className="text-blue-600 hover:underline">Filtering Logic</a>
            <a href="#performance" className="text-blue-600 hover:underline">Performance Metrics</a>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Status Metrics */}
      <Card className="mb-8" id="ticket-status">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Ticket Status Classifications
          </CardTitle>
          <CardDescription>How tickets are categorized by their current status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-red-50">New</Badge>
                <span className="text-sm text-gray-600">Status ID: 5</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-yellow-50">Open</Badge>
                <span className="text-sm text-gray-600">Status ID: 1</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50">Pending</Badge>
                <span className="text-sm text-gray-600">Status ID: 2</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-green-50">Resolved</Badge>
                <span className="text-sm text-gray-600">Status ID: 3</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-gray-50">Closed</Badge>
                <span className="text-sm text-gray-600">Status ID: 4</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Special Calculations:</h4>
            <ul className="text-sm space-y-1">
              <li><strong>Resolved Today:</strong> Tickets with status 3 or 4 updated today</li>
              <li><strong>Open Tickets:</strong> Tickets with status 1, 2, or 5 (not resolved/closed)</li>
              <li><strong>Active Tickets:</strong> All tickets except closed (status ≠ 4)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Agent Workload Classifications */}
      <Card className="mb-8" id="agent-workload">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Agent Workload Classifications
          </CardTitle>
          <CardDescription>How agent workload levels are determined</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Calculation Method:</h4>
            <div className="text-sm space-y-2">
              <p><strong>Step 1:</strong> Calculate average tickets per agent</p>
              <code className="bg-white px-2 py-1 rounded text-xs">
                avgTicketsPerAgent = totalTickets ÷ totalAgents
              </code>
              <p><strong>Step 2:</strong> Calculate each agent's ratio</p>
              <code className="bg-white px-2 py-1 rounded text-xs">
                ratio = agentTickets ÷ avgTicketsPerAgent
              </code>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-green-100 text-green-800">Light</Badge>
                  <span className="text-sm">Ratio &lt; 0.5</span>
                </div>
                <p className="text-sm text-gray-600">Less than 50% of average workload</p>
              </div>
              
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>
                  <span className="text-sm">0.5 ≤ Ratio &lt; 1.0</span>
                </div>
                <p className="text-sm text-gray-600">50-99% of average workload</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-orange-100 text-orange-800">Heavy</Badge>
                  <span className="text-sm">1.0 ≤ Ratio &lt; 1.5</span>
                </div>
                <p className="text-sm text-gray-600">100-149% of average workload</p>
              </div>
              
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-red-100 text-red-800">Overloaded</Badge>
                  <span className="text-sm">Ratio ≥ 1.5</span>
                </div>
                <p className="text-sm text-gray-600">150% or more of average workload</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Example:</h4>
            <p className="text-sm">If you have 500 tickets and 100 agents:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Average = 500 ÷ 100 = <strong>5 tickets per agent</strong></li>
              <li>• Light: &lt; 2.5 tickets</li>
              <li>• Moderate: 2.5-4.9 tickets</li>
              <li>• Heavy: 5-7.4 tickets</li>
              <li>• Overloaded: ≥ 7.5 tickets</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* SLA and Time-based Metrics */}
      <Card className="mb-8" id="sla-metrics">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            SLA & Time-based Metrics
          </CardTitle>
          <CardDescription>Understanding deadline and time-sensitive calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-red-600">SLA Breaches</h4>
              <div className="bg-red-50 p-3 rounded-lg text-sm">
                <p className="mb-2"><strong>Definition:</strong> Tickets that missed their resolution deadline</p>
                <p className="mb-2"><strong>Criteria:</strong></p>
                <ul className="space-y-1 ml-4">
                  <li>• Current time &gt; ticket.due_by</li>
                  <li>• Ticket status is still active (1, 2, or 5)</li>
                  <li>• Only counts unresolved tickets</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-orange-600">Overdue Tickets</h4>
              <div className="bg-orange-50 p-3 rounded-lg text-sm">
                <p className="mb-2"><strong>Definition:</strong> Tickets past their first response deadline</p>
                <p className="mb-2"><strong>Criteria:</strong></p>
                <ul className="space-y-1 ml-4">
                  <li>• Current time &gt; ticket.fr_due_by</li>
                  <li>• Ticket status is still active (1, 2, or 5)</li>
                  <li>• Measures response time, not resolution</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-blue-600">Unassigned Tickets</h4>
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="mb-2"><strong>Definition:</strong> Active tickets without an assigned agent</p>
              <p className="mb-2"><strong>Criteria:</strong></p>
              <ul className="space-y-1 ml-4">
                <li>• ticket.responder_id is null or empty</li>
                <li>• Ticket status is active (1, 2, or 5)</li>
                <li>• Excludes resolved/closed tickets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Calculations */}
      <Card className="mb-8" id="time-calculations">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Time-based Calculations
          </CardTitle>
          <CardDescription>How time ranges and temporal metrics work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Time Range Filters</h4>
              <div className="space-y-3">
                <div className="border rounded p-3">
                  <strong className="text-green-600">Today:</strong>
                  <p className="text-sm text-gray-600 mt-1">From 00:00:00 today to now</p>
                </div>
                <div className="border rounded p-3">
                  <strong className="text-blue-600">Week:</strong>
                  <p className="text-sm text-gray-600 mt-1">Last 7 days from now</p>
                </div>
                <div className="border rounded p-3">
                  <strong className="text-purple-600">Month:</strong>
                  <p className="text-sm text-gray-600 mt-1">From 1st of current month to now</p>
                </div>
                <div className="border rounded p-3">
                  <strong className="text-orange-600">Quarter:</strong>
                  <p className="text-sm text-gray-600 mt-1">From start of current quarter to now</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Resolution Time Analysis</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm mb-3"><strong>Calculation:</strong></p>
                <code className="text-xs bg-white px-2 py-1 rounded block mb-3">
                  resolutionTime = ticket.updated_at - ticket.created_at
                </code>
                <p className="text-sm mb-2"><strong>Categories:</strong></p>
                <ul className="text-xs space-y-1">
                  <li>• &lt; 1 hour</li>
                  <li>• 1-4 hours</li>
                  <li>• 4-24 hours</li>
                  <li>• 1-3 days</li>
                  <li>• &gt; 3 days</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Response Time Calculation</h4>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm mb-2"><strong>Average Response Time Formula:</strong></p>
              <code className="text-xs bg-white px-2 py-1 rounded block mb-3">
                avgResponseTime = (sum of all response_times) ÷ (count of tickets with response_time)
              </code>
              <p className="text-sm"><strong>Note:</strong> Only includes tickets that have response time data available from Freshservice.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtering Logic */}
      <Card className="mb-8" id="filtering">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Filtering & Data Processing
          </CardTitle>
          <CardDescription>How dashboard filters affect the displayed data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Filter Application Order:</h4>
            <ol className="text-sm space-y-2">
              <li><strong>1. Time Range:</strong> Filter by ticket creation date</li>
              <li><strong>2. Agent Filter:</strong> Filter by assigned agent (responder_id)</li>
              <li><strong>3. Status Filter:</strong> Filter by ticket status</li>
              <li><strong>4. Priority Filter:</strong> Filter by ticket priority level</li>
              <li><strong>5. Calculate Metrics:</strong> Apply all calculations to filtered dataset</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-3">Priority Levels</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Badge variant="outline">Low</Badge>
                  <span>Priority ID: 1</span>
                </div>
                <div className="flex justify-between text-sm">
                  <Badge variant="outline">Medium</Badge>
                  <span>Priority ID: 2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <Badge variant="outline">High</Badge>
                  <span>Priority ID: 3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <Badge variant="outline">Urgent</Badge>
                  <span>Priority ID: 4</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Data Refresh</h4>
              <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                <p className="mb-2"><strong>Cache Duration:</strong></p>
                <ul className="space-y-1">
                  <li>• Tickets: 3 minutes</li>
                  <li>• Agents: 5 minutes</li>
                  <li>• Rate limit: 400 calls/min (PRO plan)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="mb-8" id="performance">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Agent Performance Metrics
          </CardTitle>
          <CardDescription>How individual agent performance is calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Resolution Rate</h4>
              <div className="bg-green-50 p-3 rounded-lg">
                <code className="text-xs bg-white px-2 py-1 rounded block mb-2">
                  resolutionRate = (resolvedTickets ÷ totalTickets) × 100
                </code>
                <p className="text-sm">
                  <strong>Resolved tickets:</strong> Status 3 (Resolved) or 4 (Closed)
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Average Response Time</h4>
              <div className="bg-blue-50 p-3 rounded-lg">
                <code className="text-xs bg-white px-2 py-1 rounded block mb-2">
                  avgResponseTime = totalResponseTime ÷ responseCount
                </code>
                <p className="text-sm">
                  Converted to hours and displayed as "X.X hours"
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Agent Performance Table</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm mb-3"><strong>Sorting:</strong> Agents are sorted by resolution rate (highest first)</p>
              <p className="text-sm mb-3"><strong>Color Coding:</strong></p>
              <ul className="text-sm space-y-1">
                <li>• <span className="inline-block w-3 h-3 bg-green-200 rounded mr-2"></span>Light workload: Green indicators</li>
                <li>• <span className="inline-block w-3 h-3 bg-yellow-200 rounded mr-2"></span>Moderate workload: Yellow indicators</li>
                <li>• <span className="inline-block w-3 h-3 bg-orange-200 rounded mr-2"></span>Heavy workload: Orange indicators</li>
                <li>• <span className="inline-block w-3 h-3 bg-red-200 rounded mr-2"></span>Overloaded: Red indicators</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Data Sources & API</CardTitle>
          <CardDescription>Information about data collection and accuracy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Important Notes:</h4>
            <ul className="text-sm space-y-1">
              <li>• Data is fetched from Freshservice API in real-time</li>
              <li>• Current limit: 500 tickets per dashboard load (5 pages × 100 tickets)</li>
              <li>• Time zones: All times are processed in your browser's local timezone</li>
              <li>• Cache: Data is cached for 3-5 minutes to respect rate limits</li>
              <li>• PRO Plan: 400 API calls per minute, 120 for tickets specifically</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">For More Tickets:</h4>
            <p className="text-sm">
              If you have more than 500 tickets and need to see all data, contact your administrator 
              to adjust the pagination limits in the dashboard configuration.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-8">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
} 