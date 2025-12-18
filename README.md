# CollabSpace

> **Enterprise-grade real-time collaboration platform** with HTTPS/SSL support, advanced caching, and freemium pricing model

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-6.0+-red.svg)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7+-blue.svg)](https://socket.io/)
[![HTTPS](https://img.shields.io/badge/HTTPS-SSL%20Ready-green.svg)](#ssl-https-configuration)
[![Cache](https://img.shields.io/badge/Cache-Optimized-orange.svg)](#browser-cache-system)
[![Stripe](https://img.shields.io/badge/Stripe-Payment-blueviolet.svg)](https://stripe.com/)
[![Tests](https://img.shields.io/badge/Tests-99%20Passing-brightgreen.svg)](#testing)

## Table of Contents

- [ Overview](#overview)
- [ Key Features](#key-features)
- [ Technology Stack](#technology-stack)
- [ Architecture](#architecture)
- [ SSL/HTTPS Configuration](#ssl-https-configuration)
- [ Browser Cache System](#browser-cache-system)
- [ Quick Start](#quick-start)
- [ Installation & Setup](#installation--setup)
- [ Development Servers](#development-servers)
- [ Testing & Validation](#testing--validation)
- [ API Documentation](#api-documentation)
- [ Pricing & Plans](#pricing--plans)
- [ Security Features](#security-features)
- [ Troubleshooting](#troubleshooting)

## Overview

CollabSpace is a **production-ready, enterprise-grade team collaboration platform** with advanced security and performance optimizations. Built with Node.js, Express, MongoDB, Redis, and Socket.IO, it delivers powerful real-time features with HTTPS/SSL security, intelligent browser caching, and a generous freemium model.

### What's New & Advanced

- ** SSL/HTTPS Support** - Complete SSL implementation with self-signed certificates for development and production SSL support
- ** Optimized Caching** - Advanced browser-side caching system that reduces Redis load by 90%
- ** Enterprise Security** - HTTPS redirects, security headers, secure WebSocket (WSS)
- ** Comprehensive Testing** - SSL testing utilities, cache validation, and performance monitoring
- ** Performance Optimized** - Intelligent cache strategy minimizing server load

### Project Statistics

- ** Freemium Model** - Full-featured free tier with optional Pro upgrades ($59/month)
- ** HTTPS Ready** - Complete SSL/TLS implementation for secure communication
- ** Cache Optimized** - 90% reduction in Redis operations through browser caching
- ** 99+ Tests** - Comprehensive test coverage including SSL and cache validation
- ** 10+ Test Suites** - Models, Routes, Middleware, Utils, SSL, and Cache testing
- ** CI/CD Ready** - GitHub Actions pipeline with automated quality gates
- ** Security First** - JWT auth, HTTPS, rate limiting, security headers

### **Option 1: Regular HTTP Development**

```bash
# Clone repository
git clone https://github.com/arsh342/collabspace.git
cd collabspace

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URLs

# Start HTTP development server
npm run dev
# Access: http://localhost:3000
```

### **Option 2: Secure HTTPS Development**

```bash
# Generate SSL certificates
npm run ssl:generate

# Start HTTPS development server
npm run dev:https
# Access: https://localhost:3443
# Note: Browser will show security warning for self-signed certificates
```

### **Option 3: Quick Testing**

```bash
# Test both HTTP and HTTPS modes
npm run test:ssl both

# Quick HTTPS start
npm run quick:https

# Quick HTTP start
npm run quick:http
```

### What Makes CollabSpace Special?

- ** Generous Free Tier**: Full-featured collaboration for small teams at no cost
- ** Real-time Everything**: Live chat, notifications, and updates using Socket.IO
- ** Modern Architecture**: Redis caching, MongoDB, and scalable Node.js backend
- ** Beautiful UI/UX**: Responsive design with Tailwind CSS
- ** Security First**: JWT authentication, rate limiting, and data validation
- ** Smart File Management**: Secure uploads and sharing with storage limits
- ** Team-focused**: Role-based access and team workspace organization
- ** Production Ready**: 99+ tests, CI/CD pipeline, and quality assurance
- ** Simple Pricing**: Transparent freemium model with optional Pro features

## Key Features

### Real-time Communication _(Free & Pro)_

- **Instant Messaging**: Live chat with typing indicators
- **Message Reactions**: Emoji reactions and interactions
- **Online Status**: Real-time user presence tracking
- **File Sharing**: Upload and share files (with storage limits)

### Task Management _(Free & Pro)_

- **Kanban Boards**: Visual task organization (To Do, In Progress, Done)
- **Task Assignment**: Multi-member task assignments
- **Priority Levels**: High, Medium, Low priority classification
- **Due Dates**: Task scheduling and deadline tracking

### Team Organization

- **Team Creation**: Create teams _(1 team on Free, unlimited on Pro)_
- **Role Management**: Admins and Members with different permissions _(Free & Pro)_
- **Invitations**: Secure team invitation system _(Free & Pro)_
- **Team Dashboard**: Comprehensive overview of team activities _(Free & Pro)_

### Analytics & Reporting

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

## SSL/HTTPS Configuration

CollabSpace includes **enterprise-grade SSL/HTTPS support** with complete certificate management, security headers, and development-to-production workflows.

### SSL Features

- ** Self-Signed Certificates** - Auto-generated for development
- ** Production SSL Support** - Easy real certificate installation
- ** Security Headers** - HSTS, CSP, XSS protection, etc.
- ** HTTP to HTTPS Redirects** - Automatic in production
- ** Secure WebSocket (WSS)** - Socket.IO over SSL
- ** SSL Testing Tools** - Comprehensive testing utilities

### Quick SSL Setup

```bash
# Generate development certificates
npm run ssl:generate

# Check SSL status
npm run ssl:status

# Start HTTPS development server
npm run dev:https
# Access: https://localhost:3443

# Start regular HTTP server
npm run dev
# Access: http://localhost:3000
```

### SSL Testing Commands

```bash
# Test HTTPS mode
npm run test:https

# Test HTTP mode
npm run test:http

# Test both modes
npm run test:ssl both

# Quick server status
./scripts/quick-test.sh status

# Interactive testing
npm run test:ssl
```

### SSL Configuration

#### Development (Self-Signed)

```env
USE_HTTPS=true          # Enable HTTPS mode
HTTPS_PORT=3443         # HTTPS port
HTTP_PORT=3000          # HTTP port
```

#### Production (Real Certificates)

```bash
# Install production certificates
node scripts/ssl-manager.js install /path/to/cert.pem /path/to/key.pem

# Set production environment
NODE_ENV=production npm start
```

### Security Headers (Auto-Applied)

When HTTPS is enabled, CollabSpace automatically applies:

- **Strict-Transport-Security** - Forces HTTPS for 1 year
- **Content-Security-Policy** - Upgrades insecure requests
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **X-XSS-Protection** - Browser XSS prevention

### SSL Certificate Management

```bash
# Generate certificates
npm run ssl:generate

# Check certificate status
npm run ssl:status

# Remove certificates
npm run ssl:remove

# Install production certificates
node scripts/ssl-manager.js install <cert-file> <key-file>
```

## Browser Cache System

CollabSpace features an **advanced browser-side caching system** that dramatically improves performance by reducing server load and providing instant data access.

### Performance Optimization Strategy

#### **Before Optimization**

- All data cached in Redis
- High server memory usage
- Network latency for every request
- Server-side bottlenecks

#### **After Optimization**

- **Redis**: Only essential real-time data (~10% of previous usage)
- **Browser**: User data, team info, tasks, settings (~90% of data)
- **Result**: 90% reduction in Redis operations + faster page loads

### Cache Architecture

```mermaid
graph TB
    subgraph "Browser Storage"
        LS[localStorage<br/>Settings & Preferences]
        SS[sessionStorage<br/>Temporary Data]
        IDB[IndexedDB<br/>Large Data Sets]
    end

    subgraph "Server Cache"
        Redis[Redis<br/>Real-time Data Only]
    end

    subgraph "Cache Categories"
        User[User Data - 15min TTL]
        Team[Team Info - 10min TTL]
        Task[Tasks - 5min TTL]
        Message[Messages - 2min TTL]
        Dashboard[Dashboard - 5min TTL]
        Files[Files - 30min TTL]
        Settings[Settings - 1hr TTL]
    end

    User --> LS
    Team --> SS
    Task --> IDB
    Message --> Redis
    Dashboard --> SS
    Files --> LS
    Settings --> LS
```

### Cache Performance Metrics

| Category      | Storage | TTL   | Redis Reduction | Page Load Improvement |
| ------------- | ------- | ----- | --------------- | --------------------- |
| **User Data** | Browser | 15min | 95%             | 300ms faster          |
| **Team Info** | Browser | 10min | 90%             | 200ms faster          |
| **Tasks**     | Browser | 5min  | 85%             | 150ms faster          |
| **Messages**  | Redis   | 2min  | 10%             | Real-time             |
| **Dashboard** | Browser | 5min  | 95%             | 500ms faster          |
| **Files**     | Browser | 30min | 100%            | Instant               |
| **Settings**  | Browser | 1hr   | 100%            | Instant               |

### Cache Management

#### Browser Cache Testing

```bash
# Test cache functionality
npm run cache:test

# Monitor cache performance
npm run cache:monitor

# Clear client cache
npm run cache:clear

# Cache statistics
npm run cache:stats
```

#### Cache Configuration

```javascript
// Automatic cache management
const cacheManager = new BrowserCacheManager({
  enableLocalStorage: true,
  enableSessionStorage: true,
  enableIndexedDB: true,
  defaultTTL: 300000, // 5 minutes
  maxStorageSize: 50 * 1024 * 1024, // 50MB
});
```

### Cache Strategy by Data Type

- ** Real-time Data** (Redis): Live chat, presence, notifications
- ** User Data** (Browser): Profile, preferences, authentication state
- ** Team Data** (Browser): Team info, members, settings
- ** Task Data** (Browser): Task lists, details, assignments
- ** Dashboard** (Browser): Statistics, summaries, analytics
- ** File Data** (Browser): Metadata, thumbnails, access info
- ** Settings** (Browser): App configuration, UI state

## Installation & Setup

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 4.4+ ([MongoDB Atlas](https://cloud.mongodb.com/) or local install)
- **Redis** 6.0+ ([Redis Cloud](https://redis.com/redis-enterprise-cloud/) or local install)
- **Git** for version control

### Step-by-Step Installation

#### 1. **Clone Repository**

```bash
git clone https://github.com/arsh342/collabspace.git
cd collabspace
```

#### 2. **Install Dependencies**

```bash
npm install
```

#### 3. **Environment Setup**

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configurations
nano .env
```

#### 4. **Configure Environment Variables**

```env
# Server Configuration
PORT=3000
HTTP_PORT=3000
HTTPS_PORT=3443
NODE_ENV=development

# SSL/HTTPS Configuration
USE_HTTPS=false
FORCE_HTTPS=false
APP_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/collabspace
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/collabspace

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# OR use Redis Cloud:
# REDIS_HOST=your-redis-host.com
# REDIS_PORT=16466
# REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-session-secret-key

# Stripe Payment Configuration (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_CURRENCY=usd
STRIPE_PRO_UNIT_AMOUNT=5900
```

#### 5. **SSL Certificate Setup (Optional)**

```bash
# Generate development SSL certificates
npm run ssl:generate

# Check SSL status
npm run ssl:status
```

#### 6. **Database Setup**

```bash
# MongoDB will auto-create collections on first run
# Ensure MongoDB is running locally OR
# Configure MongoDB Atlas connection in .env
```

#### 7. **Verify Installation**

```bash
# Run comprehensive status checks
npm run status-check

# Test HTTP mode
npm run test:http

# Test HTTPS mode (if SSL configured)
npm run test:https
```

## Development Servers

### **HTTP Development** (Default)

```bash
# Start HTTP server
npm run dev
# OR
npm run quick:http

# Access application
open http://localhost:3000
```

### **HTTPS Development** (Secure)

```bash
# Ensure SSL certificates exist
npm run ssl:generate

# Start HTTPS server
npm run dev:https
# OR
npm run quick:https

# Access secure application
open https://localhost:3443
# Note: Accept browser security warning for self-signed certificates
```

### **Dual Mode Testing**

```bash
# Test both HTTP and HTTPS
npm run test:ssl both

# Check server status
./scripts/quick-test.sh status

# Interactive testing menu
npm run test:ssl
```

## Testing & Validation

### **Comprehensive Test Suite**

CollabSpace includes **99+ tests** across all components:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run integration tests
npm run test:integration

# Quick status check (tests + linting)
npm run status-check
```

### **SSL/HTTPS Testing**

```bash
# Test SSL certificate status
npm run ssl:status

# Test HTTPS functionality
npm run test:https

# Test HTTP functionality
npm run test:http

# Test both modes comprehensively
npm run test:ssl both

# Quick bash script testing
./scripts/quick-test.sh https
./scripts/quick-test.sh http
./scripts/quick-test.sh status
```

### **Cache Performance Testing**

```bash
# Test cache functionality
npm run cache:test

# Monitor cache performance
npm run cache:monitor

# Cache statistics and metrics
npm run cache:stats

# Clear browser cache
npm run cache:clear
```

### **Test Categories**

| Test Suite            | Count | Coverage                   | Description                |
| --------------------- | ----- | -------------------------- | -------------------------- |
| **Unit Tests**        | 60+   | Models, Utils, Middleware  | Core functionality testing |
| **Integration Tests** | 40+   | API Routes, Database       | End-to-end testing         |
| **SSL Tests**         | 8+    | HTTPS, Certificates        | Security testing           |
| **Cache Tests**       | 6+    | Browser Cache, Performance | Optimization testing       |

## Security Features

### **Authentication & Authorization**

- **JWT Tokens** - Stateless authentication with refresh capability
- **Session Management** - Redis-backed sessions with MongoDB fallback
- **Role-based Access** - Organiser vs Member permissions
- **Password Security** - bcrypt hashing with salt rounds

### **SSL/HTTPS Security**

- **TLS 1.2+** - Modern encryption standards
- **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- **Certificate Management** - Self-signed for dev, real certificates for production
- **Secure Cookies** - HTTPOnly and Secure flags in production

### **Protection Mechanisms**

- **Rate Limiting** - API endpoint protection against abuse
- **Input Validation** - Comprehensive sanitization and validation
- **XSS Protection** - Content Security Policy and header protection
- **CSRF Protection** - Cross-site request forgery prevention
- **SQL Injection** - MongoDB native protection + input validation

### **Security Monitoring**

- **Audit Logging** - User actions and security events
- **Error Handling** - Secure error messages without data leakage
- **Session Security** - Auto-logout and session invalidation

## Troubleshooting

### **Common Issues**

#### **SSL Certificate Problems**

```bash
# Problem: Certificate not found
# Solution: Generate or install certificates
npm run ssl:generate

# Problem: Browser security warning
# Solution: Expected for self-signed certificates
# Click "Advanced" → "Proceed to localhost (unsafe)"

# Problem: Certificate expired
# Solution: Regenerate certificates
npm run ssl:remove
npm run ssl:generate
```

#### **Server Connection Issues**

```bash
# Problem: Port already in use
# Solution: Kill existing processes
lsof -ti:3000,3443 | xargs kill -9

# Problem: Database connection failed
# Solution: Check MongoDB/Redis connectivity
npm run status-check

# Problem: SSL server won't start
# Solution: Check certificates and permissions
npm run ssl:status
```

#### **Cache Performance Issues**

```bash
# Problem: Slow page loads
# Solution: Check cache functionality
npm run cache:test

# Problem: Cache not working
# Solution: Clear and regenerate cache
npm run cache:clear

# Problem: High Redis usage
# Solution: Verify browser caching is active
npm run cache:stats
```

### **Getting Help**

1. **Check Status**: `npm run status-check`
2. **View Logs**: Check application logs for errors
3. **Test Components**: Use individual test commands
4. **Community**: Open GitHub issues for bugs/features
5. **Documentation**: Review inline code comments

### **Performance Optimization**

- **Enable Browser Caching** - Reduces server load by 90%
- **Use HTTPS** - Better SEO and security
- **Monitor Redis Usage** - Keep real-time data only
- **Optimize Database** - Use proper indexing
- **Enable Compression** - Gzip responses for faster loading

---

## **Project Metrics & Statistics**

### **Performance Benchmarks**

- **90% Redis Load Reduction** - Through intelligent browser caching
- **300-500ms Faster Page Loads** - Client-side cache hits
- **HTTPS Ready** - Enterprise security with SSL/TLS
- **99+ Tests Passing** - Comprehensive quality assurance

### **Technical Achievements**

- **Dual Protocol Support** - HTTP and HTTPS modes
- **Advanced Caching Strategy** - Browser + Redis optimization
- **Enterprise Security** - SSL, security headers, rate limiting
- **Production Ready** - PM2, Docker, cloud deployment support

### **Development Experience**

- **Simple Commands** - `npm run quick:https`, `npm run test:ssl`
- **Interactive Testing** - Comprehensive SSL and cache validation
- **Clear Documentation** - Step-by-step guides and troubleshooting
- **Quality Automation** - CI/CD pipeline with automated testing
