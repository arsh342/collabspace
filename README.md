# CollabSpace – Team Collaboration Platform

A comprehensive team collaboration platform built with Node.js, featuring real-time chat, task management, team collaboration, and more.

## 🚀 Features

### Core Functionality

- **User Authentication & Authorization**: JWT-based authentication with role-based access control (Admin/Member)
- **Team Management**: Create, join, and manage teams with public/private options
- **Task Management**: Full CRUD operations with Kanban-style board, drag & drop, and status tracking
- **Real-time Chat**: Team-based chat with Socket.IO, typing indicators, and file sharing
- **Real-time Updates**: Live task updates, user status changes, and notifications

### Advanced Features

- **CLI Tool**: Database backup and statistics generation
- **File Management**: Upload and share files in chat and tasks
- **Search & Filtering**: Advanced search across teams, tasks, and messages
- **Responsive Design**: Modern, mobile-friendly UI built with Bootstrap 5
- **Security**: Helmet, CORS, rate limiting, and input validation

## 🛠️ Tech Stack

### Backend

- **Node.js** (Latest LTS)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend

- **EJS** - Server-side templating
- **Bootstrap 5** - CSS framework
- **Font Awesome** - Icons
- **Custom CSS/JS** - Styling and interactions

### Development & Deployment

- **Nodemon** - Development server
- **PM2** - Production process manager
- **dotenv** - Environment configuration
- **Express Validator** - Input validation
- **Multer** - File uploads

## 📁 Project Structure

```
collabspace/
├── src/
│   ├── config/          # Database and JWT configuration
│   ├── controllers/     # Business logic (to be implemented)
│   ├── middleware/      # Authentication, logging, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── utils/           # Utility functions (to be implemented)
│   ├── views/           # EJS templates
│   │   ├── partials/    # Reusable components
│   │   └── *.ejs        # Page templates
│   └── public/          # Static assets
│       ├── css/         # Stylesheets
│       ├── js/          # Client-side JavaScript
│       └── images/      # Images and icons
├── logs/                # Application logs
├── app.js               # Main application file
├── cli.js               # Command-line interface
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd collabspace
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**

   ```bash
   # Make sure MongoDB is running
   mongod
   ```

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run prod
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Default port: 3000 (configurable via PORT environment variable)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/collabspace

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# External APIs
UNSPLASH_ACCESS_KEY=your-unsplash-key
AVATAR_API_URL=https://api.example.com/avatars

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Database Setup

The application will automatically create the necessary collections when it starts. Make sure MongoDB is running and accessible.

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Teams

- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Tasks

- `GET /api/tasks` - Get tasks for user
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Messages

- `GET /api/messages/team/:teamId` - Get team messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

## 🖥️ CLI Tool

The project includes a command-line interface for database operations:

```bash
# Database backup
node cli.js --backup

# Show statistics
node cli.js --stats

# Help
node cli.js --help
```

### CLI Commands

- `--backup, -b`: Create a complete database backup
- `--stats, -s`: Display comprehensive database statistics
- `--help, -h`: Show help information

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and Member roles with different permissions
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against brute force attacks
- **Helmet**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing
- **Password Hashing**: bcryptjs for secure password storage

## 📊 Database Models

### User

- Authentication fields (username, email, password)
- Profile information (firstName, lastName, avatar, bio)
- Role and permissions (admin, member)
- Account status and security features

### Team

- Team information (name, description, settings)
- Member management (admin, members, invited users)
- Privacy settings (public/private)
- Statistics and activity tracking

### Task

- Task details (title, description, status, priority)
- Assignment and tracking (assignedTo, dueDate, progress)
- Time logging and comments
- Dependencies and attachments

### Message

- Message content and type (text, file, system)
- Team-based organization
- Reactions and replies
- File attachments and mentions

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
# Start with PM2
npm run prod

# Stop the application
npm run stop

# Restart the application
npm run restart
```

### Environment Variables

Make sure to set appropriate environment variables for production:

- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Production `MONGODB_URI`
- Configure logging and monitoring

## 📝 Logging

The application includes comprehensive logging:

- Console and file-based logging
- Different log levels (error, warn, info, debug)
- HTTP request/response logging
- Error tracking and monitoring

Logs are stored in the `./logs/` directory.

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions on GitHub

## 🗺️ Roadmap

### Phase 1 (Current)

- ✅ Basic authentication and user management
- ✅ Team creation and management
- ✅ Task management with Kanban board
- ✅ Real-time chat functionality
- ✅ Basic CLI tools

### Phase 2 (Planned)

- [ ] Advanced task dependencies and workflows
- [ ] Calendar integration and scheduling
- [ ] Advanced file management and versioning
- [ ] Mobile application
- [ ] Advanced analytics and reporting

### Phase 3 (Future)

- [ ] AI-powered task suggestions
- [ ] Advanced integrations (Slack, Teams, etc.)
- [ ] Multi-tenant architecture
- [ ] Advanced security features
- [ ] Performance optimizations

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by popular collaboration platforms
- Community-driven development approach

---

**CollabSpace** - Empowering teams to collaborate effectively and achieve more together! 🚀
