# CollabSpace

> A comprehensive real-time team collaboration platform built with modern web technologies

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-6.0+-red.svg)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7+-blue.svg)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment-blueviolet.svg)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [System Flow](#system-flow)
- [Database Schema](#database-schema)
- [Payment Integration](#payment-integration)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)

## Overview

CollabSpace is a modern, full-featured team collaboration platform designed to streamline team communication, task management, and project coordination. Built with Node.js, Express, MongoDB, Redis, and Socket.IO, it provides real-time features that enhance team productivity and collaboration.

### What Makes CollabSpace Special?

- **Real-time Everything**: Live chat, notifications, and updates using Socket.IO
- **Scalable Architecture**: Redis-backed caching and session management
- **Modern UI/UX**: Responsive design with Tailwind CSS
- **Robust Security**: JWT authentication, rate limiting, and data validation
- **File Management**: Secure file uploads and sharing
- **Team-centric**: Organize work around teams with role-based access

## Key Features

### Real-time Communication

- **Instant Messaging**: Live chat with typing indicators
- **Message Reactions**: Emoji reactions and interactions
- **Online Status**: Real-time user presence tracking
- **File Sharing**: Upload and share files in conversations

### Task Management

- **Kanban Boards**: Visual task organization (To Do, In Progress, Done)
- **Task Assignment**: Multi-member task assignments
- **Priority Levels**: High, Medium, Low priority classification
- **Due Dates**: Task scheduling and deadline tracking

### Team Organization

- **Team Creation**: Organize users into teams
- **Role Management**: Organizers and Members with different permissions
- **Invitations**: Secure team invitation system
- **Team Dashboard**: Comprehensive overview of team activities

### Analytics & Reporting

- **Dashboard Statistics**: Team performance metrics
- **Activity Tracking**: Monitor team engagement
- **Progress Reports**: Task completion rates
- **Usage Analytics**: Platform utilization insights

### Payment & Billing

- **Stripe Integration**: Secure payment processing
- **Subscription Management**: Recurring billing for premium features
- **Multiple Payment Methods**: Cards, digital wallets, bank transfers
- **Invoice Generation**: Automated billing and receipts

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
    Q --> T[Jest]
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

## Payment Integration

CollabSpace integrates with Stripe to provide secure, reliable payment processing for premium features and team subscriptions.

### Stripe Features Implemented

#### Subscription Management

- **Multiple Plans**: Free and Pro tiers
- **Recurring Billing**: Automatic monthly/yearly subscription processing
- **Plan Upgrades/Downgrades**: Seamless plan transitions with prorated billing
- **Trial Periods**: Free trial support for premium features

#### Payment Processing

- **Secure Checkout**: Stripe Elements for PCI-compliant payment forms
- **Multiple Payment Methods**: Credit/debit cards, digital wallets (Apple Pay, Google Pay)
- **International Support**: Multi-currency support for global teams
- **3D Secure**: Enhanced security for card payments

#### Billing Management

- **Customer Portal**: Self-service billing management
- **Invoice Generation**: Automated invoicing with PDF receipts
- **Payment History**: Complete transaction history
- **Failed Payment Handling**: Smart retry logic and dunning management

### Stripe Integration Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Stripe API
    participant W as Webhook Handler

    U->>F: Subscribe to Premium
    F->>B: Create Subscription Request
    B->>S: Create Customer & Subscription
    S-->>B: Return Subscription Object
    B->>F: Redirect to Stripe Checkout
    F->>S: Complete Payment

    S->>W: Send Webhook (invoice.paid)
    W->>B: Process Subscription Activation
    B->>B: Update User Premium Status

    Note over U,W: Ongoing Subscription Management
    S->>W: Recurring Payment Webhooks
    W->>B: Update Billing Status
    B->>U: Send Notification
```

### Payment Flow Implementation

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

### Subscription Tiers

| Feature                 | Free    | Premium         | Enterprise      |
| ----------------------- | ------- | --------------- | --------------- |
| **Teams**               | 1 team  | Unlimited teams | Unlimited teams |
| **Members**             | Up to 5 | Up to 50        | Unlimited       |
| **Storage**             | 1GB     | 100GB           | 1TB             |
| **Advanced Analytics**  | ❌      | ✅              | ✅              |
| **Priority Support**    | ❌      | ✅              | ✅              |
| **Custom Integrations** | ❌      | ❌              | ✅              |
| **SSO**                 | ❌      | ❌              | ✅              |
| **Price/month**         | Free    | $9.99           | $29.99          |

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

### System Requirements

| Component   | Minimum             | Recommended |
| ----------- | ------------------- | ----------- |
| **RAM**     | 2GB                 | 4GB+        |
| **Storage** | 5GB                 | 10GB+       |
| **CPU**     | 2 cores             | 4+ cores    |
| **OS**      | Linux/macOS/Windows | Linux/macOS |

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

# Stripe Payment Integration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_endpoint_secret_here
STRIPE_PRO_UNIT_AMOUNT=5900
STRIPE_PRO_DEFAULT_SEATS=5
STRIPE_PRO_MAX_SEATS=500
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

### User Roles

#### Organizer

- Create and manage teams
- Invite team members
- Create and assign tasks
- Access all team features
- View team analytics

#### Team Member

- View team tasks
- Participate in team chat
- Update task status
- Share files
- Receive notifications

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

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --grep "Authentication"
```

### Test Structure

```
__tests__/
├── app.routes.test.js          # Main app routes
├── middleware/
│   └── auth.test.js           # Authentication middleware
├── routes/
│   ├── auth.firebase.test.js  # Firebase auth routes
│   ├── payments.test.js       # Payment functionality
│   └── teams.freemium.test.js # Team features
└── utils/
    └── dashboardSummary.test.js # Dashboard utilities
```

### Sample Test

```javascript
// __tests__/routes/auth.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("Authentication Routes", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "securepassword123",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body).toHaveProperty("token");
    });

    it("should reject duplicate email registration", async () => {
      // First registration
      await request(app).post("/api/auth/register").send({
        firstName: "Jane",
        lastName: "Smith",
        username: "janesmith",
        email: "jane@example.com",
        password: "password123",
      });

      // Duplicate email registration
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
          email: "jane@example.com", // Same email
          password: "password456",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });
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
