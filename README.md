# CollabSpace - Team Collaboration Platform

![CollabSpace Logo](https://via.placeholder.com/200x80/1e40af/ffffff?text=CollabSpace)

A comprehensive team collaboration platform built with Node.js, Express, MongoDB, and Socket.IO. CollabSpace provides real-time chat, task management, team organization, and file sharing capabilities for modern teams.

## 🚀 Features

### Core Features

- **Real-time Team Chat** - Instant messaging with Socket.IO
- **Task Management** - Create, assign, and track tasks with Kanban boards
- **Team Organization** - Create teams, invite members, manage roles
- **File Sharing** - Upload and share files in chat and tasks
- **User Authentication** - Secure login with session management
- **Responsive Design** - Works on desktop, tablet, and mobile

### Advanced Features

- **Role-based Access Control** - Organizers and Members with different permissions
- **Real-time Notifications** - Live updates for messages, tasks, and team activities
- **Message Reactions** - React to messages with emojis
- **File Attachments** - Support for images, documents, and other files
- **Typing Indicators** - See when team members are typing
- **Online Status** - Track who's currently online
- **Search Functionality** - Search messages and tasks
- **Dashboard Analytics** - Overview of team activity and progress

## 🛠️ Technology Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling

### Frontend

- **EJS** - Template engine
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - Client-side functionality
- **Font Awesome** - Icons
- **Socket.IO Client** - Real-time communication

### Development Tools

- **Nodemon** - Development server
- **PM2** - Production process manager
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 📁 Project Structure

```
collabspace/
├── src/                          # Source code
│   ├── app.js                   # Main application entry point
│   ├── config/                  # Configuration files
│   │   ├── database.js          # MongoDB connection
│   │   └── jwt.js              # JWT configuration
│   ├── middleware/              # Express middleware
│   │   ├── auth.js             # Authentication middleware
│   │   ├── errorHandler.js     # Error handling
│   │   ├── logger.js           # Logging middleware
│   │   └── rateLimiter.js      # Rate limiting
│   ├── models/                  # Database models
│   │   ├── User.js             # User model
│   │   ├── Team.js             # Team model
│   │   ├── Task.js             # Task model
│   │   ├── Message.js          # Message model
│   │   └── TeamInvitation.js   # Team invitation model
│   ├── routes/                  # API routes
│   │   ├── auth.js             # Authentication routes
│   │   ├── users.js            # User management
│   │   ├── teams.js            # Team management
│   │   ├── tasks.js            # Task management
│   │   ├── chat.js             # Chat functionality
│   │   ├── messages.js         # Message handling
│   │   ├── dashboard.js        # Dashboard data
│   │   ├── invitations.js      # Team invitations
│   │   ├── member-api.js       # Member API endpoints
│   │   ├── member-api-simple.js # Simplified member API
│   │   └── upload.js           # File upload handling
│   ├── views/                   # EJS templates
│   │   ├── layouts/            # Layout templates
│   │   ├── partials/           # Reusable components
│   │   ├── index.ejs           # Landing page
│   │   ├── login.ejs           # Login page
│   │   ├── register.ejs        # Registration page
│   │   ├── dashboard.ejs       # Main dashboard
│   │   ├── organiser-dashboard.ejs # Organizer dashboard
│   │   ├── member-dashboard.ejs # Member dashboard
│   │   └── [other pages].ejs   # Additional pages
│   ├── public/                  # Static assets
│   │   ├── css/                # Stylesheets
│   │   └── js/                 # Client-side JavaScript
│   └── utils/                   # Utility functions
│       └── dashboardSummary.js # Dashboard calculations
├── uploads/                     # File uploads directory
├── logs/                        # Application logs
├── package.json                 # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/collabspace.git
   cd collabspace
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/collabspace

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d

   # Session
   SESSION_SECRET=your-session-secret

   # Server
   PORT=3000
   NODE_ENV=development

   # File Upload
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=5242880
   ```

4. **Start MongoDB**

   ```bash
   # Using MongoDB service
   sudo systemctl start mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 🔧 Configuration

### Database Configuration

The application uses MongoDB with Mongoose ODM. Database connection is configured in `src/config/database.js`:

```javascript
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
```

### Authentication

- **Session-based authentication** for web interface
- **JWT tokens** for API access
- **Password hashing** with bcryptjs
- **Rate limiting** to prevent brute force attacks

### File Upload

- **Multer** for handling multipart/form-data
- **File type validation** for security
- **Size limits** to prevent abuse
- **Organized storage** in uploads directory

## 📊 Database Schema

### User Model

```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (required),
  firstName: String (required),
  lastName: String (required),
  avatar: String,
  phone: String,
  bio: String,
  isOnline: Boolean,
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Team Model

```javascript
{
  name: String (required),
  description: String,
  admin: ObjectId (ref: User),
  members: [ObjectId] (ref: User),
  avatar: String,
  isPublic: Boolean,
  lastActivity: Date,
  lastMessage: ObjectId (ref: Message),
  createdAt: Date,
  updatedAt: Date
}
```

### Task Model

```javascript
{
  title: String (required),
  description: String,
  team: ObjectId (ref: Team),
  assignedTo: ObjectId (ref: User),
  createdBy: ObjectId (ref: User),
  status: String (enum: ['todo', 'in_progress', 'review', 'completed']),
  priority: String (enum: ['low', 'medium', 'high']),
  dueDate: Date,
  attachments: [Object],
  isArchived: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model

```javascript
{
  content: String (required),
  team: ObjectId (ref: Team),
  sender: ObjectId (ref: User),
  messageType: String (enum: ['text', 'file', 'image', 'system']),
  attachments: [Object],
  reactions: [Object],
  replyTo: Object,
  mentions: [Object],
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Teams

- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add team member
- `DELETE /api/teams/:id/members/:userId` - Remove team member

### Tasks

- `GET /api/tasks` - Get tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Chat & Messages

- `GET /api/chat/conversations` - Get conversations
- `GET /api/chat/messages/:conversationId` - Get messages
- `POST /api/chat/messages` - Send message
- `PUT /api/chat/messages/:id` - Edit message
- `DELETE /api/chat/messages/:id` - Delete message

### File Upload

- `POST /api/upload` - Upload file
- `GET /api/files/:filename` - Get file

## 🎨 User Interface

### Dashboard Types

1. **Organizer Dashboard** - Full access to team management
2. **Member Dashboard** - Limited access to assigned tasks and team chat

### Key UI Components

- **Navigation Sidebar** - Quick access to different sections
- **Team Chat Interface** - Real-time messaging with file support
- **Task Kanban Board** - Visual task management
- **Team Management** - Create and manage teams
- **User Profile** - Account settings and preferences

## 🔒 Security Features

- **Password Hashing** - bcryptjs with salt rounds
- **Session Management** - Secure session storage
- **Rate Limiting** - Prevent abuse and DDoS attacks
- **Input Validation** - Sanitize and validate all inputs
- **File Upload Security** - Type and size validation
- **CORS Configuration** - Control cross-origin requests
- **Helmet.js** - Security headers

## 🚀 Deployment

### Production Setup

1. **Environment Variables**

   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-jwt-secret
   SESSION_SECRET=your-production-session-secret
   ```

2. **Using PM2**

   ```bash
   npm run prod    # Start with PM2
   npm run stop    # Stop PM2 process
   npm run restart # Restart PM2 process
   ```

3. **Using Docker**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

### Deployment Platforms

- **Heroku** - Easy deployment with buildpacks
- **DigitalOcean** - VPS deployment
- **AWS EC2** - Scalable cloud deployment
- **Docker** - Containerized deployment

## 🧪 Testing

### Manual Testing

- User registration and login
- Team creation and management
- Task creation and assignment
- Real-time chat functionality
- File upload and sharing

### Test Scripts

```bash
# Test database connection
node test-app.js

# Test date handling
node test-createdAt.js
```

## 📝 Development Guidelines

### Code Style

- Use ES6+ features
- Follow async/await pattern
- Implement proper error handling
- Add comprehensive logging
- Write descriptive comments

### Git Workflow

- Feature branches for new development
- Pull requests for code review
- Semantic commit messages
- Regular merges to main branch

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the code comments
- Contact the development team

## 🔮 Future Enhancements

- **Video Conferencing** - Integrated video calls
- **Calendar Integration** - Task scheduling and deadlines
- **Mobile App** - React Native or Flutter app
- **Advanced Analytics** - Team performance metrics
- **Third-party Integrations** - Slack, Discord, GitHub
- **AI Features** - Smart task suggestions and chat bots

---

**CollabSpace** - Bringing teams together, one collaboration at a time! 🚀
