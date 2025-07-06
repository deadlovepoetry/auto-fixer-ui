# Vercel Logs Dashboard

A React application that allows you to fetch and view deployment logs and error logs from your Vercel projects using the Vercel API.

## Features

- 🔐 Secure API token authentication
- 📁 Browse your Vercel projects
- 🚀 View deployment history
- 📋 Fetch deployment logs
- ❌ Filter and view error logs
- 🔨 View build logs
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 14 or higher
- npm or yarn
- A Vercel account and API token

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Getting Your Vercel API Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Settings → Tokens
3. Create a new token with appropriate permissions
4. Copy the token and paste it into the application

### Usage

1. **Enter API Token**: Paste your Vercel API token in the configuration section
2. **Team ID (Optional)**: If you're part of a team, enter your team ID
3. **Fetch Projects**: Click "Fetch Projects" to load your available projects
4. **Select Project**: Choose a project from the dropdown
5. **Fetch Deployments**: Click "Fetch Deployments" to load deployment history
6. **Select Deployment**: Choose a specific deployment to view its logs
7. **View Logs**: Browse through different types of logs using the tabs:
   - **Deployment Logs**: General deployment information
   - **Error Logs**: Filtered error messages and stack traces
   - **Build Logs**: Build process logs and compilation messages

## API Endpoints Used

This application uses the following Vercel API endpoints:

- `GET /v9/projects` - List projects
- `GET /v6/deployments` - List deployments for a project
- `GET /v2/deployments/{id}/events` - Get deployment logs
- `GET /v13/deployments/{id}` - Get deployment details

## Project Structure

```
src/
├── components/
│   ├── VercelLogs.js      # Main dashboard component
│   └── VercelLogs.css     # Styling for the dashboard
├── services/
│   └── vercelApi.js       # Vercel API service class
├── App.js                 # Main app component
├── App.css                # Global styles
└── index.js               # App entry point
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## Security Notes

- Never commit your API tokens to version control
- Use environment variables for sensitive data in production
- The API token is stored only in component state and is not persisted

## Troubleshooting

### Common Issues

1. **"Failed to fetch projects"**: Check that your API token is valid and has the correct permissions
2. **"No deployments found"**: Make sure the selected project has deployments
3. **"No logs found"**: Some deployments may not have logs depending on their state

### API Rate Limits

Vercel API has rate limits. If you encounter rate limiting:
- Wait a few minutes before making more requests
- Reduce the number of concurrent requests
- Consider caching responses for frequently accessed data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
