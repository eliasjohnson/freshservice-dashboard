# Freshservice Dashboard

A sleek, modern dashboard for visualizing and monitoring your Freshservice ITSM data. This dashboard provides real-time insights into your service desk operations, including ticket trends, agent performance, and more.

## Features

- **Real-time metrics**: View current ticket stats and trends
- **Agent performance tracking**: Monitor response times and workloads
- **Interactive charts**: Visualize data with beautiful, responsive charts
- **Mobile-friendly**: Responsive design works on all devices
- **Mock data mode**: Development mode with mock data for testing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Freshservice account with API access

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/freshservice-dashboard.git
   cd freshservice-dashboard
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. **Configure your Freshservice API settings:**

   Create a `.env.local` file in the root directory with your Freshservice API credentials:
   ```
   REACT_APP_FRESHSERVICE_DOMAIN=your-domain.freshservice.com
   REACT_APP_FRESHSERVICE_API_KEY=your-api-key-here
   ```

   **Finding your API Key:**
   - Login to your Freshservice Portal
   - Click on your profile picture (top right corner)
   - Go to "Profile settings"
   - Your API key will be available below the "Delegate Approvals" section

   **Example configuration:**
   ```
   REACT_APP_FRESHSERVICE_DOMAIN=acme.freshservice.com
   REACT_APP_FRESHSERVICE_API_KEY=9CRirBinRIRpTonm2X
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Integration

This dashboard uses the Freshservice API v1/v2 to fetch real-time data. The API integration:

- **Authentication**: Uses Basic Auth with API Key format `APIKey:X`
- **Proxy Setup**: Development proxy handles CORS issues
- **Endpoints**: Supports both v1 (`/helpdesk`, `/itil`) and v2 (`/api/v2`) endpoints
- **Error Handling**: Graceful fallbacks and detailed logging

### API Configuration

The API configuration is managed in `src/config.ts`:
- Domain and API key from environment variables
- Automatic base URL generation
- Debug logging enabled for development

### Troubleshooting API Issues

**Common Issues:**

1. **401 Unauthorized**: Check your API key
2. **403 Forbidden**: API key lacks permissions
3. **404 Not Found**: Verify domain name is correct
4. **429 Rate Limited**: Wait before retrying (1000 calls/hour limit)

**Debug Mode:**
The dashboard includes detailed API logging. Check the browser console for:
- Request/response details
- Authentication headers
- Error messages with solutions

## Project Structure

```
freshservice-dashboard/
├── public/                  # Static files
├── src/                     # Source code
│   ├── components/          # React components
│   │   ├── Common/          # Shared components
│   │   ├── Dashboard/       # Dashboard components
│   │   ├── Tickets/         # Ticket-related components
│   │   └── Assets/          # Asset-related components
│   ├── services/            # API services
│   │   ├── freshserviceApi.ts  # Main API integration
│   │   └── api.ts           # Data processing utilities
│   ├── types/               # TypeScript type definitions
│   ├── contexts/            # React contexts (API state)
│   ├── utils/               # Utility functions
│   ├── config.ts            # Application configuration
│   ├── setupProxy.js        # Development proxy setup
│   ├── App.tsx              # Main App component
│   └── index.tsx            # Entry point
└── package.json             # Dependencies and scripts
```

## Development

### Mock Data Mode

If you can't connect to the Freshservice API, the dashboard will automatically fall back to mock data. This is useful for:
- Development without API access
- Testing UI components
- Demonstrating the dashboard

To force mock data mode, set `enableMockData: true` in `src/config.ts`.

### API Testing

The dashboard includes API connection testing:
- Automatic connection check on startup
- Manual retry functionality
- Multiple endpoint fallbacks
- Detailed error reporting

## Supported Freshservice Features

- ✅ Tickets (list, view, stats)
- ✅ Agents (list, view)
- ✅ Dashboard metrics
- ⏳ Assets (planned)
- ⏳ Service Catalog (planned)
- ⏳ Changes (planned)

## Future Enhancements

- [ ] Add user authentication
- [ ] Implement ticket management features
- [ ] Add asset management dashboard
- [ ] Create custom report builder
- [ ] Add Slack/Teams integration
- [ ] Implement real-time notifications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
