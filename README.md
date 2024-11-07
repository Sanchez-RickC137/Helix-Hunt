# HelixHunt

HelixHunt is a comprehensive web application designed to explore and analyze genetic variations with ease and efficiency. The platform provides a user-friendly interface for querying ClinVar data, supporting both targeted and general searches across genetic variations.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Started with Create React App](#getting-started-with-create-react-app)
- [Dependencies](#dependencies)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [License](#license)

## Features

### Dual Query System
- **Targeted Search**: Query specific gene names or variation IDs
- **General Search**: Broader querying using combinations of gene symbols, DNA changes, and protein changes

### Multiple Data Sources
- Web-based ClinVar queries
- Local database queries for faster access to common data

### User Management
- User authentication and authorization
- Personalized preferences storage
- Query history tracking

### Data Export
- Multiple format support (CSV, TSV, XML)
- Results preview functionality

### Responsive Design
- Mobile-friendly interface
- Dark mode support

## Tech Stack

### Frontend
- React 18.2.0
- React Router DOM 6.8.1
- Tailwind CSS 3.2.7
- Lucide React (Icons)
- TSParticles (Animated backgrounds)

### Backend
- Node.js/Express
- MySQL 8.0+
- JWT Authentication
- SendGrid (Email services)

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v14+ recommended)
- npm (v6+ recommended)
- MySQL (v8.0+ recommended)
- Git

## Installation

1. **Clone the Repository**
```bash
git clone https://github.com/your-username/helixhunt.git
cd Helix-Hunt
```

2. **Install Dependencies**
```bash
# Install all dependencies
npm install
```

3. **Environment Setup**

Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=helixhunt

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
NOTIFICATION_EMAIL=your_notification_email
```

### Generating JWT Secret Key

For security, you should use a strong, random JWT secret key. Here are several ways to generate one:

#### Option 1: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Option 2: Using OpenSSL
```bash
openssl rand -hex 64
```

#### Option 3: Using Python
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

Copy the generated string and use it as your `JWT_SECRET` in the `.env` file.

#### Important Security Notes
- **Never share or commit your JWT secret**
- **Environment Separation**: Use a different secret key for each environment (development, staging, production)
- **Key Length**: Make your secret at least 64 characters long
- **Key Rotation**: Consider rotating the secret periodically in production environments


4. **Database Setup**
```bash
# Log into MySQL
mysql -u root -p

# Create database
CREATE DATABASE helixhunt;

# Create user and grant privileges
CREATE USER 'helixhunt_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON helixhunt.* TO 'helixhunt_user'@'localhost';
FLUSH PRIVILEGES;
```

Run database migrations:
```bash
node server/config/migrations.js
```

5. **Initial Data Load**
```bash
# Run the test sequence to load initial data
node server/services/fileService/initialDataLoad.js
```

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

#### `npm run dev`

Runs both the frontend and backend servers concurrently.\
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5001](http://localhost:5001)

#### `npm run server`

Runs only the backend server at [http://localhost:5001](http://localhost:5001)

#### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature.

## Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.8.1",
  "express": "^4.21.1",
  "mysql2": "^3.11.3",
  "axios": "^0.21.4"
}
```

### Authentication & Security
```json
{
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "express-rate-limit": "^7.4.1",
  "express-validator": "^7.2.0",
  "cors": "^2.8.5"
}
```

### Data Processing & Utilities
```json
{
  "cheerio": "^1.0.0",
  "json2csv": "^6.0.0-alpha.2",
  "lodash": "^4.17.21",
  "xml2js": "^0.6.2"
}
```

### UI & Visualization
```json
{
  "lucide-react": "^0.279.0",
  "@tsparticles/react": "^3.0.0",
  "@tsparticles/slim": "^3.0.2"
}
```

### Email & Communication
```json
{
  "@sendgrid/mail": "^8.1.4"
}
```

### Development & Testing
```json
{
  "@testing-library/jest-dom": "^5.16.5",
  "@testing-library/react": "^13.4.0",
  "@testing-library/user-event": "^13.5.0",
  "tailwindcss": "^3.2.7",
  "concurrently": "^7.6.0"
}
```

## Project Structure
```
helixhunt/
├── public/            # Static files
├── src/
│   ├── components/    # React components
│   ├── contexts/      # Context providers
│   ├── utils/         # Utility functions
│   └── App.js         # Root component
├── server/
│   ├── config/        # Configuration files
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Express middleware
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   └── utils/         # Utility functions
└── package.json
```

## Contributing

### Git Workflow

1. **Ensure your current work is committed**
```bash
git add .
git commit -m "Your commit message"
```

2. **Update main branch with latest changes**
```bash
git checkout main
git pull origin main
```

3. **Create and switch to a new feature branch**
```bash
git checkout -b feature/your-feature-name
```

4. **Rebase your branch on main**
```bash
git checkout feature/your-feature-name
git rebase main
```

5. **Push your branch to GitHub**
```bash
git push origin feature/your-feature-name
```

6. **Create Pull Request**
- Go to the repository on GitHub
- Click "Pull Requests" > "New Pull Request"
- Select your branch as the compare branch
- Fill out the PR template with:
  - Description of changes
  - Any related issues
  - Testing performed
  - Screenshots (if UI changes)

7. **After PR is approved and merged**
```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name  # Delete local branch
```

### Pull Request Guidelines
- Keep PRs focused on a single feature or fix
- Include proper documentation for new features
- Ensure all tests pass
- Follow existing code style and conventions
- Request review from at least one team member

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/change-password` - Change password
- `POST /api/forgot-password` - Initiate password reset
- `POST /api/reset-password` - Complete password reset

### Queries
- `POST /api/clinvar` - Process web-based targeted query
- `POST /api/clinvar/general` - Process web-based general query
- `POST /api/database/variation-id` - Query by variation ID
- `POST /api/database/full-name` - Query by full name
- `POST /api/database/general-search` - General database search
- `POST /api/download` - Download results

### User Preferences
- `GET /api/user-preferences` - Get user preferences
- `PUT /api/user-preferences` - Update user preferences
- `GET /api/query-history` - Get user's query history
- `POST /api/save-query` - Save a query to history

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify MySQL is running
   - Check credentials in .env file
   - Ensure database exists and permissions are correct

2. **Node Module Issues**
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install
```

3. **Port Conflicts**
   - Check if ports 3000 or 5001 are in use
   - Modify PORT in .env file if needed

### Logs
- Server logs: `logs/update_*.log`
- Debug information available in development mode

## Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)

### Advanced Topics
- [Code Splitting](https://facebook.github.io/create-react-app/docs/code-splitting)
- [Analyzing the Bundle Size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)
- [Making a Progressive Web App](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)
- [Advanced Configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)
- [Deployment](https://facebook.github.io/create-react-app/docs/deployment)
- [Build Failures](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Support

For support:
1. Check the documentation
2. Search existing GitHub issues
3. Create a new issue with detailed information about your problem

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For any additional questions or concerns, please contact the project maintainers.