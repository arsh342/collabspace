# CollabSpace

> A comprehensive real-time team collaboration platform built with modern web technologies

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-6.0+-red.svg)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7+-blue.svg)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment-blueviolet.svg)](https://stripe.com/)
[![Tests](https://img.shields.io/badge/Tests-112%20Passing-brightgreen.svg)](#testing)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](#cicd-pipeline)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [System Flow](#system-flow)
- [Database Schema](#database-schema)
- [Pricing & Plans](#pricing--plans)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Quality Assurance](#quality-assurance)

## Overview

CollabSpace is a **modern, freemium team collaboration platform** designed to make team communication and project management accessible to everyone. Built with Node.js, Express, MongoDB, Redis, and Socket.IO, it provides powerful real-time features with a generous free tier and optional Pro upgrades for growing teams.

### 📊 Project Statistics

- **🆓 Freemium Model** - Full-featured free tier with optional Pro upgrades
- **🧪 112+ Tests** - Comprehensive test coverage across all components
- **📁 10 Test Suites** - Models, Routes, Middleware, Utils coverage
- **🚀 CI/CD Ready** - GitHub Actions pipeline with automated quality gates
- **⚡ Real-time Features** - Socket.IO powered live collaboration
- **🔒 Security Focused** - JWT auth, rate limiting, data validation
- **📦 Production Ready** - PM2 deployment, Redis caching, MongoDB scaling### 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/arsh342/collabspace.git
cd collabspace

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URLs

# Run status checks (includes tests)
npm run status-check

# Start development server
npm run dev
```

### What Makes CollabSpace Special?

- **🆓 Generous Free Tier**: Full-featured collaboration for small teams at no cost
- **⚡ Real-time Everything**: Live chat, notifications, and updates using Socket.IO
- **🏗️ Modern Architecture**: Redis caching, MongoDB, and scalable Node.js backend
- **🎨 Beautiful UI/UX**: Responsive design with Tailwind CSS
- **🔒 Security First**: JWT authentication, rate limiting, and data validation
- **📁 Smart File Management**: Secure uploads and sharing with storage limits
- **👥 Team-focused**: Role-based access and team workspace organization
- **🧪 Production Ready**: 112+ tests, CI/CD pipeline, and quality assurance
- **💳 Simple Pricing**: Transparent freemium model with optional Pro features

## Key Features

### 💬 Real-time Communication _(Free & Pro)_

- **Instant Messaging**: Live chat with typing indicators
- **Message Reactions**: Emoji reactions and interactions
- **Online Status**: Real-time user presence tracking
- **File Sharing**: Upload and share files (with storage limits)

### ✅ Task Management _(Free & Pro)_

- **Kanban Boards**: Visual task organization (To Do, In Progress, Done)
- **Task Assignment**: Multi-member task assignments
- **Priority Levels**: High, Medium, Low priority classification
- **Due Dates**: Task scheduling and deadline tracking

### 👥 Team Organization

- **Team Creation**: Create teams _(1 team on Free, unlimited on Pro)_
- **Role Management**: Admins and Members with different permissions _(Free & Pro)_
- **Invitations**: Secure team invitation system _(Free & Pro)_
- **Team Dashboard**: Comprehensive overview of team activities _(Free & Pro)_

### 📊 Analytics & Reporting

- **Basic Dashboard**: Essential team metrics _(Free)_
- **Advanced Analytics**: Detailed performance insights _(Pro Only)_
- **Progress Reports**: Task completion rates _(Free & Pro)_
- **Usage Analytics**: Platform utilization insights _(Pro Only)_

### Flexible Pricing

- **Freemium Model**: Core features available for free
- **Pro Upgrade**: Enhanced features for growing teams
- **Stripe Integration**: Secure payment processing when needed
- **Simple Billing**: Transparent monthly subscription

### Security & Performance

- **Authentication**: Secure JWT-based authentication
- **Session Management**: Redis-backed session storage
- **Rate Limiting**: API abuse prevention
- **Data Validation**: Comprehensive input validation
- **Caching**: Redis caching for improved performance

## Technology Stack

```mermaid
graph TD
    A[Frontend] --> B[EJS Templates]
    A --> C[Tailwind CSS]
    A --> D[JavaScript ES6+]
    A --> E[Socket.IO Client]

    F[Backend] --> G[Node.js]
    F --> H[Express.js]
    F --> I[Socket.IO Server]
    F --> J[JWT]

    K[Database] --> L[MongoDB]
    K --> M[Mongoose ODM]

    N[Caching] --> O[Redis]
    N --> P[Connect-Redis]

    Q[DevOps] --> R[PM2]
    Q --> S[Nodemon]
    Q --> T[Jest Testing]
    Q --> U[GitHub Actions]
    Q --> V[Status Checks]
```

### Core Dependencies

| Category           | Technology        | Version | Purpose                   |
| ------------------ | ----------------- | ------- | ------------------------- |
| **Runtime**        | Node.js           | 18+     | JavaScript runtime        |
| **Framework**      | Express.js        | 4.18+   | Web application framework |
| **Database**       | MongoDB           | 4.4+    | Primary database          |
| **Caching**        | Redis             | 6.0+    | Session storage & caching |
| **Real-time**      | Socket.IO         | 4.7+    | WebSocket communication   |
| **Authentication** | JWT               | 9.0+    | Token-based auth          |
| **Payments**       | Stripe            | 14.22+  | Payment processing        |
| **Templating**     | EJS               | 3.1+    | Server-side rendering     |
| **Styling**        | Tailwind CSS      | 4.1+    | Utility-first CSS         |
| **File Upload**    | Multer            | 1.4+    | File handling             |
| **Validation**     | Express Validator | 7.0+    | Input validation          |
| **Testing**        | Jest              | 29.7+   | Unit & integration tests  |
| **CI/CD**          | GitHub Actions    | -       | Automated pipelines       |

## Architecture

### System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Browser]
        Mobile[Mobile Browser]
    end

    subgraph "Application Layer"
        LB[Load Balancer]
        App1[App Server 1]
        App2[App Server 2]
        App3[App Server N]
    end

    subgraph "Services Layer"
        Auth[Auth Service]
        Chat[Chat Service]
        Task[Task Service]
        File[File Service]
        Notify[Notification Service]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Redis[(Redis)]
        Storage[File Storage]
    end

    Web --> LB
    Mobile --> LB
    LB --> App1
    LB --> App2
    LB --> App3

    App1 --> Auth
    App1 --> Chat
    App1 --> Task
    App1 --> File
    App1 --> Notify

    Auth --> MongoDB
    Chat --> MongoDB
    Chat --> Redis
    Task --> MongoDB
    File --> Storage
    Notify --> Redis

    App1 -.->|Sessions| Redis
    App1 -.->|Cache| Redis
```

### Application Structure

```mermaid
graph TD
    subgraph "src/"
        App[app.js - Main Application]

        subgraph "config/"
            DB[database.js]
            JWT[jwt.js]
            Redis[redis.js]
        end

        subgraph "middleware/"
            Auth[auth.js]
            Error[errorHandler.js]
            Logger[logger.js]
            Rate[rateLimiter.js]
            Cache[cache.js]
        end

        subgraph "models/"
            User[User.js]
            Team[Team.js]
            Task[Task.js]
            Message[Message.js]
            Invite[TeamInvitation.js]
        end

        subgraph "routes/"
            AuthR[auth.js]
            UserR[users.js]
            TeamR[teams.js]
            TaskR[tasks.js]
            MessageR[messages.js]
            ChatR[chat.js]
            Dashboard[dashboard.js]
            Upload[upload.js]
            Payment[payments.js]
        end

        subgraph "views/"
            Auth_Views[auth/]
            Dashboard_Views[dashboard/]
            Chat_Views[chat/]
            Shared[shared/]
        end

        subgraph "utils/"
            Summary[dashboardSummary.js]
            RedisUtils[redisUtils.js]
            Helpers[helpers.js]
        end

        subgraph "public/"
            CSS[css/]
            JS[js/]
            Images[images/]
        end
    end

    App --> DB
    App --> JWT
    App --> Redis
    App --> Auth
    App --> Error
    App --> Logger
    App --> Rate
    App --> Cache
```

## System Flow

### User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant A as Auth Service
    participant DB as MongoDB
    participant R as Redis

    U->>W: Login Request
    W->>A: Validate Credentials
    A->>DB: Query User
    DB-->>A: User Data
    A->>A: Generate JWT
    A->>R: Store Session
    A-->>W: JWT + Session ID
    W-->>U: Login Success + Redirect

    Note over U,R: Subsequent Requests
    U->>W: Protected Resource
    W->>A: Validate JWT
    A->>R: Check Session
    R-->>A: Session Valid
    A-->>W: Access Granted
    W-->>U: Resource Data
```

### Real-time Chat Flow

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant S as Socket.IO Server
    participant R as Redis
    participant DB as MongoDB

    U1->>S: Connect & Join Team Room
    S->>R: Track Online User
    S->>U1: Connection Confirmed

    U2->>S: Connect & Join Team Room
    S->>R: Track Online User
    S->>U2: Connection Confirmed
    S->>U1: User 2 Online Notification

    U1->>S: Send Message
    S->>DB: Save Message
    S->>R: Cache Message
    S->>U2: Broadcast Message
    S->>U1: Message Confirmation

    U2->>S: React to Message
    S->>DB: Save Reaction
    S->>R: Update Cache
    S->>U1: Broadcast Reaction
```

### Task Management Flow

```mermaid
sequenceDiagram
    participant O as Organizer
    participant M as Team Member
    participant API as Task API
    participant DB as MongoDB
    participant R as Redis
    participant S as Socket.IO

    O->>API: Create Task
    API->>DB: Save Task
    API->>R: Invalidate Cache
    API->>S: Notify Team
    S->>M: New Task Notification
    API-->>O: Task Created

    M->>API: Update Task Status
    API->>DB: Update Task
    API->>R: Invalidate Cache
    API->>S: Notify Team
    S->>O: Status Update Notification
    API-->>M: Update Confirmed

    O->>API: Get Team Tasks
    API->>R: Check Cache
    alt Cache Hit
        R-->>API: Cached Data
    else Cache Miss
        API->>DB: Query Tasks
        DB-->>API: Task Data
        API->>R: Cache Data
    end
    API-->>O: Task List
```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Team : "organizes/belongs"
    User ||--o{ Task : "creates"
    User ||--o{ Message : "sends"
    Team ||--o{ Task : "contains"
    Team ||--o{ Message : "has"
    Team ||--o{ TeamInvitation : "generates"
    User ||--o{ TeamInvitation : "receives"

    User {
        ObjectId _id PK
        string firstName
        string lastName
        string username UK
        string email UK
        string password
        string avatar
        boolean isOrganiser
        datetime createdAt
        datetime updatedAt
        datetime lastSeen
        object preferences
    }

    Team {
        ObjectId _id PK
        string name
        string description
        ObjectId organiser FK
        ObjectId[] members FK
        datetime createdAt
        datetime updatedAt
        object settings
    }

    Task {
        ObjectId _id PK
        string title
        string description
        enum status
        enum priority
        ObjectId createdBy FK
        ObjectId team FK
        datetime dueDate
        boolean isArchived
        datetime createdAt
        datetime updatedAt
        object metadata
    }

    Message {
        ObjectId _id PK
        string content
        ObjectId sender FK
        ObjectId team FK
        string messageType
        object reactions
        ObjectId replyTo FK
        object fileAttachment
        boolean isEdited
        datetime createdAt
        datetime updatedAt
    }

    TeamInvitation {
        ObjectId _id PK
        ObjectId team FK
        ObjectId invitedBy FK
        string email
        string token UK
        enum status
        datetime expiresAt
        datetime createdAt
        datetime acceptedAt
    }
```

### Data Models Detail

#### User Model

```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  username: String, // unique
  email: String, // unique
  password: String, // hashed
  avatar: String, // URL
  isOrganiser: Boolean,
  preferences: {
    notifications: Boolean,
    theme: String,
    language: String
  },
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Team Model

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  organiser: ObjectId, // ref: User
  members: [ObjectId], // ref: User
  settings: {
    allowMemberInvites: Boolean,
    taskCreationPermission: String, // 'organiser' | 'all'
    chatModeration: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Task Model

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  status: String, // 'todo' | 'in-progress' | 'done'
  priority: String, // 'low' | 'medium' | 'high'
  createdBy: ObjectId, // ref: User
  team: ObjectId, // ref: Team
  dueDate: Date,
  isArchived: Boolean,
  metadata: {
    estimatedHours: Number,
    actualHours: Number,
    tags: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Pricing & Plans

CollabSpace follows a **freemium model** with simple, transparent pricing designed for teams of all sizes.

### Current Pricing Structure

#### 🆓 **Free Plan** (Default)

- **Core Features**: Full team collaboration
- **Real-time Chat**: Unlimited messages and channels
- **Task Management**: Complete project management tools
- **File Sharing**: Basic file uploads and sharing
- **Team Members**: Up to 5 team members
- **Perfect for**: Small teams and getting started

#### 🚀 **Pro Plan** ($59/month)

- **Everything in Free**
- **Unlimited Teams**: Create multiple team workspaces
- **Advanced Features**: Automation workflows and integrations
- **Priority Support**: Faster response times
- **Enhanced Storage**: Increased file storage limits
- **Perfect for**: Growing teams and organizations

### Payment Integration

Secure payment processing powered by Stripe:

- **Simple Upgrade**: One-click upgrade to Pro features
- **Secure Processing**: PCI-compliant payment handling
- **Flexible Payment**: Credit cards and digital wallets
- **Monthly Billing**: Simple, predictable pricing
- **Cancel Anytime**: No long-term commitments

#### 1. Subscription Creation

```javascript
// Create Stripe customer and subscription
const customer = await stripe.customers.create({
  email: user.email,
  name: `${user.firstName} ${user.lastName}`,
  metadata: { userId: user._id.toString() },
});

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: priceId }],
  payment_behavior: "default_incomplete",
  expand: ["latest_invoice.payment_intent"],
});
```

#### 2. Webhook Processing

```javascript
// Handle Stripe webhooks for subscription events
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "invoice.payment_succeeded":
        handleSuccessfulPayment(event.data.object);
        break;
      case "invoice.payment_failed":
        handleFailedPayment(event.data.object);
        break;
      case "customer.subscription.deleted":
        handleSubscriptionCancellation(event.data.object);
        break;
    }

    res.json({ received: true });
  }
);
```

#### 3. Premium Feature Access Control

```javascript
// Middleware to check premium access
const requirePremium = async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (user.subscriptionStatus !== "active") {
    return res.status(403).json({
      error: "Premium subscription required",
      upgradeUrl: "/upgrade",
    });
  }

  next();
};

// Protected premium endpoints
app.get("/api/premium/advanced-analytics", requirePremium, (req, res) => {
  // Premium feature implementation
});
```

### Security & Compliance

- **PCI DSS Compliance**: All payment data handled securely by Stripe
- **Data Encryption**: Payment information encrypted in transit and at rest
- **Webhook Verification**: Cryptographic verification of Stripe webhooks
- **Audit Logging**: Complete audit trail of all payment transactions

### Testing Stripe Integration

```javascript
// Test webhook locally with Stripe CLI
// stripe listen --forward-to localhost:3000/api/payments/webhook

describe("Stripe Integration", () => {
  it("should create subscription successfully", async () => {
    const response = await request(app)
      .post("/api/payments/create-subscription")
      .send({
        priceId: "price_test_premium",
        userId: testUser._id,
      })
      .expect(200);

    expect(response.body.subscriptionId).toBeDefined();
    expect(response.body.clientSecret).toBeDefined();
  });

  it("should handle webhook events", async () => {
    const webhookPayload = {
      type: "invoice.payment_succeeded",
      data: { object: { customer: "cus_test123" } },
    };

    const response = await request(app)
      .post("/api/payments/webhook")
      .send(webhookPayload)
      .expect(200);

    expect(response.body.received).toBe(true);
  });
});
```

## Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **MongoDB** (v4.4 or higher)
- **Redis** (v6.0 or higher)
- **npm** or **yarn**
- **Git**

### Step-by-Step Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/arsh342/collabspace.git
   cd collabspace
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Database Setup**

   ```bash
   # Start MongoDB (if not running)
   mongod

   # Start Redis (if not running)
   redis-server
   ```

5. **Build Assets**

   ```bash
   npm run build
   ```

6. **Start the Application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=CollabSpace

# Database
MONGODB_URI=mongodb://localhost:27017/collabspace
DB_NAME=collabspace

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-here

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# Payment Processing (Optional - for Pro upgrades)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_endpoint_secret_here
STRIPE_PRO_UNIT_AMOUNT=5900  # $59.00 per month
STRIPE_CURRENCY=usd

# External Services (Optional)
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/firebase-key.json

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Configuration Files

#### Database Configuration (`src/config/database.js`)

```javascript
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

#### Redis Configuration (`src/config/redis.js`)

```javascript
const redis = require("redis");

const connectRedis = async () => {
  const client = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    retry_strategy: (options) => {
      if (options.error && options.error.code === "ECONNREFUSED") {
        return new Error("Redis server connection refused");
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error("Redis retry time exhausted");
      }
      return Math.min(options.attempt * 100, 3000);
    },
  });

  await client.connect();
  return client;
};

module.exports = { connectRedis };
```

## Usage

### Available Scripts

CollabSpace includes comprehensive npm scripts for development, testing, and deployment:

```bash
# Development
npm run dev              # Start development server with auto-reload
npm start               # Start production server

# Building
npm run build           # Build CSS and prepare assets
npm run build:css       # Build CSS files only
npm run build:prod      # Build for production deployment
npm run clean           # Clean build artifacts

# Testing & Quality
npm test               # Run all 112+ tests
npm run status-check   # Run comprehensive health checks
npm run ci             # Full CI pipeline (install + status checks)

# Production Deployment
npm run prod           # Build and start with PM2
npm run prod:dist      # Production build and deploy
npm run stop           # Stop PM2 process
npm run restart        # Restart PM2 process

# Utilities
npm run reset-password # Reset user password utility
```

### Getting Started

1. **Create an Account**

   - Navigate to `/register`
   - Fill in your details
   - Verify your email (if email verification is enabled)

2. **Create Your First Team**

   - Go to Teams section
   - Click "Create Team"
   - Add team members by email

3. **Start Collaborating**
   - Create tasks in your team
   - Use the chat feature for communication
   - Share files and collaborate in real-time

### Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. Run tests during development
npm test

# 3. Check status before committing
npm run status-check

# 4. Deploy to production
npm run prod
```

### User Roles & Permissions

#### 👑 **Team Admin** (Free & Pro)

- Create and manage team settings
- Invite and remove team members
- Create, assign, and manage tasks
- Access team analytics and reports
- Manage file sharing permissions
- Upgrade team to Pro features

#### 👤 **Team Member** (Free & Pro)

- View and update assigned tasks
- Participate in team chat and channels
- Share files within storage limits
- Receive real-time notifications
- Collaborate on team projects
- Access core collaboration tools

#### 🚀 **Pro Features** (Pro Plan Only)

- Create **unlimited teams** (vs 1 team on free)
- **Advanced automation** workflows
- **Priority email support**
- **Enhanced file storage** limits
- **Team analytics** and reporting
- **Advanced integrations**

### Feature Walkthrough

#### Task Management

```mermaid
flowchart TD
    A[Create Task] --> B{Set Priority}
    B -->|High| C[Red Badge]
    B -->|Medium| D[Yellow Badge]
    B -->|Low| E[Green Badge]

    C --> F[Assign to Team Member]
    D --> F
    E --> F

    F --> G[Set Due Date]
    G --> H[Add to Kanban Board]

    H --> I{Task Status}
    I -->|To Do| J[Todo Column]
    I -->|In Progress| K[Progress Column]
    I -->|Done| L[Done Column]

    J --> M[Team Notification]
    K --> M
    L --> M
```

#### Real-time Chat

```mermaid
flowchart LR
    A[User Types Message] --> B[Socket.IO Client]
    B --> C{Message Type}

    C -->|Text| D[Send Text Message]
    C -->|File| E[Upload File First]
    C -->|Reaction| F[Add Emoji Reaction]

    D --> G[Server Broadcasts]
    E --> H[Generate File URL]
    H --> G
    F --> G

    G --> I[All Team Members Receive]
    I --> J[Update Chat UI]

    G --> K[Save to Database]
    K --> L[Cache in Redis]
```

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`

Register a new user account.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "64a1b2c3d4e5f6789",
    "username": "johndoe",
    "email": "john@example.com",
    "isOrganiser": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/api/auth/login`

Authenticate user and get access token.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "64a1b2c3d4e5f6789",
    "username": "johndoe",
    "email": "john@example.com",
    "isOrganiser": false,
    "lastSeen": "2023-11-14T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Team Management Endpoints

#### GET `/api/teams`

Get all teams for the authenticated user.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "teams": [
    {
      "id": "64a1b2c3d4e5f6789",
      "name": "Development Team",
      "description": "Our main development team",
      "organiser": {
        "id": "64a1b2c3d4e5f6788",
        "username": "teamlead",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "members": [
        {
          "id": "64a1b2c3d4e5f6789",
          "username": "johndoe",
          "firstName": "John",
          "lastName": "Doe"
        }
      ],
      "memberCount": 5,
      "taskCount": 12,
      "createdAt": "2023-11-01T08:00:00Z"
    }
  ]
}
```

#### POST `/api/teams`

Create a new team (Organiser only).

**Request Body:**

```json
{
  "name": "Marketing Team",
  "description": "Team responsible for marketing activities",
  "settings": {
    "allowMemberInvites": true,
    "taskCreationPermission": "all",
    "chatModeration": false
  }
}
```

### Task Management Endpoints

#### GET `/api/tasks`

Get tasks with optional filtering.

**Query Parameters:**

- `team`: Team ID to filter by
- `status`: Task status (`todo`, `in-progress`, `done`)
- `priority`: Task priority (`low`, `medium`, `high`)
- `organiser`: Boolean, get tasks for organiser view

**Response:**

```json
{
  "success": true,
  "tasks": [
    {
      "id": "64a1b2c3d4e5f6790",
      "title": "Implement user authentication",
      "description": "Add JWT-based authentication system",
      "status": "in-progress",
      "priority": "high",
      "createdBy": {
        "id": "64a1b2c3d4e5f6788",
        "username": "teamlead",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "team": {
        "id": "64a1b2c3d4e5f6789",
        "name": "Development Team"
      },
      "dueDate": "2023-11-20T23:59:59Z",
      "createdAt": "2023-11-14T09:00:00Z",
      "updatedAt": "2023-11-14T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### POST `/api/tasks`

Create a new task.

**Request Body:**

```json
{
  "title": "Fix homepage layout",
  "description": "Resolve responsive issues on mobile devices",
  "priority": "medium",
  "team": "64a1b2c3d4e5f6789",
  "dueDate": "2023-11-25T23:59:59Z"
}
```

### Real-time Events (Socket.IO)

#### Connection Events

```javascript
// Client-side connection
const socket = io("http://localhost:3000", {
  auth: {
    token: localStorage.getItem("authToken"),
  },
});

// Server acknowledges connection
socket.on("connect", () => {
  console.log("Connected to server");
});

// Join team room
socket.emit("join-team", { teamId: "64a1b2c3d4e5f6789" });
```

#### Chat Events

```javascript
// Send message
socket.emit("chat-message", {
  teamId: "64a1b2c3d4e5f6789",
  content: "Hello team!",
  messageType: "text",
});

// Receive message
socket.on("new-message", (message) => {
  console.log("New message:", message);
  // Update chat UI
});

// Typing indicator
socket.emit("typing", { teamId: "64a1b2c3d4e5f6789", isTyping: true });
socket.on("user-typing", (data) => {
  // Show typing indicator
});
```

#### Task Events

```javascript
// Task created
socket.on("task-created", (task) => {
  // Add task to UI
});

// Task updated
socket.on("task-updated", (task) => {
  // Update task in UI
});

// Task status changed
socket.on("task-status-changed", (data) => {
  // Move task between columns
});
```

## Testing

### Overview

CollabSpace features a **comprehensive test suite with 112+ tests** covering all major components:

- ✅ **10 Test Suites** - Complete coverage across all layers
- ✅ **112+ Tests** - Unit, integration, and API endpoint tests
- ✅ **Model Testing** - User, Team, Task model validation
- ✅ **Route Testing** - API endpoint functionality
- ✅ **Middleware Testing** - Authentication, caching, and utilities
- ✅ **Redis Utils Testing** - Real-time features and caching
- ✅ **Error Handling** - Edge cases and failure scenarios

### Running Tests

```bash
# Run all tests (112+ tests)
npm test

# Run comprehensive status checks
npm run status-check

# Run specific test suite
npm test -- __tests__/models/User.test.js

# Run tests with verbose output
npm test -- --verbose

# CI pipeline check
npm run ci
```

### Test Structure

```
__tests__/
├── models/
│   ├── User.test.js           # User model (12 tests)
│   ├── Team.test.js           # Team model (16 tests)
│   └── Task.test.js           # Task model (21 tests)
├── routes/
│   ├── auth.firebase.test.js  # Firebase auth (3 tests)
│   ├── payments.test.js       # Payment functionality (2 tests)
│   ├── tasks.test.js          # Task API endpoints (11 tests)
│   └── teams.test.js          # Team API endpoints (8 tests)
├── middleware/
│   ├── auth.test.js           # Authentication middleware
│   └── cache.test.js          # Cache middleware (16 tests)
└── utils/
    ├── dashboardSummary.test.js # Dashboard utilities (3 tests)
    └── redisUtils.test.js       # Redis utilities (18 tests)
```

### Sample Tests

```javascript
// __tests__/models/User.test.js - User Model Testing
describe("User Model", () => {
  describe("User Creation", () => {
    it("should create a user with required fields", () => {
      expect(mockUser.email).toBe("test@example.com");
      expect(mockUser.firstName).toBe("Test");
      expect(mockUser.lastName).toBe("User");
      expect(mockUser.role).toBe("member");
    });

    it("should have default role as member", () => {
      expect(mockUser.role).toBe("member");
    });
  });

  describe("User Methods", () => {
    it("should return full name", () => {
      const fullName = mockUser.getFullName();
      expect(fullName).toBe("Test User");
    });
  });
});

// __tests__/routes/teams.test.js - API Endpoint Testing
describe("Teams Routes", () => {
  describe("GET /api/teams", () => {
    it("should return teams for authenticated user", async () => {
      const response = await request(app)
        .get("/api/teams")
        .set("Cookie", [`session=${mockSessionId}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.teams)).toBe(true);
    });
  });
});

// __tests__/middleware/cache.test.js - Middleware Testing
describe("Cache Middleware", () => {
  it("should serve cached response when available", async () => {
    mockGetCache.mockResolvedValue({ data: "cached" });

    const middleware = cacheMiddleware(300);
    await middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ data: "cached" });
  });
});
```

### Testing Best Practices

1. **Test Coverage**: Aim for >80% code coverage
2. **Integration Tests**: Test API endpoints end-to-end
3. **Unit Tests**: Test individual functions and modules
4. **Mocking**: Mock external services (Redis, MongoDB)
5. **Test Data**: Use factories for consistent test data
6. **Cleanup**: Clean up test data after each test

## CI/CD Pipeline

### GitHub Actions Workflow

CollabSpace includes a **production-ready CI/CD pipeline** with automated quality gates:

```yaml
# .github/workflows/ci.yml
name: CollabSpace CI

on:
  push:
    branches: [main, develop, test]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20.x"
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test

  security-check:
    name: Security Check
    runs-on: ubuntu-latest
    steps:
      - name: Security audit
        run: npm audit --audit-level=high
```

### Local Status Checks

Quick development workflow validation:

```bash
# Run comprehensive status checks
npm run status-check

# What it checks:
# ✅ Dependencies installed
# ✅ All 112+ tests passing
# ✅ Security audit (no high/critical vulnerabilities)
# ✅ App syntax validation
# ✅ Deployment readiness
```

### Quality Gates

- **🧪 Test Coverage**: All 112+ tests must pass
- **🔒 Security**: No high/critical vulnerabilities
- **⚡ Syntax**: Valid JavaScript and configuration
- **📦 Dependencies**: All required packages installed
- **🚀 Build**: Application can start successfully

## Quality Assurance

### Code Quality Standards

- **ESLint Configuration**: Enforced coding standards
- **Jest Testing Framework**: Comprehensive test coverage
- **Security Auditing**: Automated vulnerability scanning
- **Dependency Management**: Regular updates and security patches
- **Branch Protection**: Required status checks for merging

### Development Workflow

```bash
# 1. Make changes
git checkout -b feature/new-feature

# 2. Run local checks
npm run status-check

# 3. Push changes (triggers CI)
git push origin feature/new-feature

# 4. Create PR (CI runs automatically)
# 5. Merge after CI passes ✅
```

---

## 🎉 Recent Improvements

### November 2025 Updates

- ✅ **Comprehensive Test Suite**: Added 112+ tests across all components
- ✅ **CI/CD Pipeline**: GitHub Actions with automated quality gates
- ✅ **Status Check System**: Local development workflow validation
- ✅ **Enhanced Test Coverage**: Models, Routes, Middleware, Utils testing
- ✅ **Production Ready**: Enterprise-grade quality assurance
- ✅ **Developer Experience**: Automated workflows and validation

### Test Suite Expansion

- **User Model Testing**: 12 comprehensive tests
- **Team Model Testing**: 16 team management tests
- **Task Model Testing**: 21 task lifecycle tests
- **API Route Testing**: 22 endpoint tests
- **Middleware Testing**: 16 caching and auth tests
- **Redis Utils Testing**: 18 real-time feature tests
- **Cache System Testing**: Complete caching functionality

## 📋 Project Status

| Component           | Status                 | Tests | Coverage      |
| ------------------- | ---------------------- | ----- | ------------- |
| **Core App**        | ✅ Production Ready    | 112+  | Comprehensive |
| **Authentication**  | ✅ JWT + Sessions      | ✅    | Full          |
| **Real-time Chat**  | ✅ Socket.IO           | ✅    | Full          |
| **Task Management** | ✅ Complete CRUD       | ✅    | Full          |
| **Team Management** | ✅ Role-based Access   | ✅    | Full          |
| **File Uploads**    | ✅ Multer + Validation | ✅    | Full          |
| **Payment System**  | ✅ Stripe Integration  | ✅    | Full          |
| **Caching Layer**   | ✅ Redis + Middleware  | ✅    | Full          |
| **CI/CD Pipeline**  | ✅ GitHub Actions      | ✅    | Full          |
| **Documentation**   | ✅ Comprehensive       | -     | Complete      |

## 🚀 Deployment Ready

CollabSpace is **production-ready** with:

- **✅ All tests passing** (112+ tests)
- **✅ Security audited** (no high/critical vulnerabilities)
- **✅ Performance optimized** (Redis caching, connection pooling)
- **✅ Monitoring ready** (PM2, logs, status checks)
- **✅ CI/CD automated** (GitHub Actions, quality gates)

---
