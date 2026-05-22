# 🎬 MyPOV - Movie Review & Recommendation Platform

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.2.4-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green)](https://www.mongodb.com/)

A comprehensive full-stack movie review and recommendation platform that combines social features, AI-powered recommendations, and a modern user experience. Built with React 19, Node.js, Express, and MongoDB.

## 🌟 Features

### 🎯 Core Functionality
- **Personal Movie Reviews**: Write detailed reviews with ratings (1-10) and personal POVs
- **AI-Powered Recommendations**: Content-based filtering using TF-IDF vectors and cosine similarity
- **Social Community**: Follow users, like reviews, explore public feeds
- **Movie Discovery**: Search and browse movies with rich metadata from TMDB and OMDb APIs
- **Activity Feed**: Real-time updates on followed users' activities
- **Trending Content**: Discover popular movies and trending reviews

### 🔐 Authentication & Security
- JWT-based authentication with secure password hashing (bcrypt)
- Protected routes and middleware validation
- Rate limiting and security headers (Helmet)
- CORS configuration for cross-origin requests
- Input validation and sanitization

### 🎨 User Experience
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Real-time Search**: Instant movie search with debounced API calls
- **Progressive Loading**: Optimized performance with lazy loading
- **Offline Support**: Service worker for caching (planned)

### 📊 Analytics & Insights
- **Personal Taste Profiles**: Machine learning-based user preference analysis
- **Recommendation Engine**: Hybrid scoring system (genre, recency, similarity, ratings)
- **Trending Algorithms**: Popularity-based content discovery
- **Activity Tracking**: Comprehensive user interaction logging

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features and hooks
- **Vite** - Fast build tool and development server
- **React Router v7** - Declarative routing with data loading
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API communication
- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities

### Backend
- **Node.js 18+** - JavaScript runtime with ES modules
- **Express.js** - Fast, unopinionated web framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - API rate limiting
- **express-validator** - Input validation middleware

### External APIs
- **OMDb API** - Movie metadata and ratings
- **TMDB API** - Additional movie information and images
- **Natural** - Natural language processing for text analysis
- **ml-distance** - Machine learning distance calculations

### Development Tools
- **ESLint** - Code linting and formatting
- **Jest** - Backend testing framework
- **Supertest** - API endpoint testing
- **Nodemon** - Development server auto-restart

## 📁 Project Structure

```
MyPOV/
├── client/                          # React Frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── api/                     # API client functions
│   │   │   ├── auth.js             # Authentication API calls
│   │   │   ├── entries.js          # Entry/review API calls
│   │   │   ├── recommendations.js  # Recommendation API calls
│   │   │   ├── tmdb.js            # TMDB API integration
│   │   │   └── users.js           # User profile API calls
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Hero.jsx           # Landing page hero section
│   │   │   ├── HeroPOV.jsx        # POV-specific hero
│   │   │   ├── Navbar.jsx         # Navigation component
│   │   │   ├── PostCard.jsx       # Review card component
│   │   │   └── PublicPostCard.jsx # Public feed card
│   │   ├── pages/                 # Page components
│   │   │   ├── Activity.jsx       # User activity feed
│   │   │   ├── Dashboard.jsx      # User dashboard
│   │   │   ├── Home.jsx           # Authenticated home
│   │   │   ├── Landing.jsx        # Public landing page
│   │   │   ├── LogEntry.jsx       # Create/edit reviews
│   │   │   ├── Login.jsx          # Authentication page
│   │   │   ├── MoviePage.jsx      # Individual movie view
│   │   │   ├── PostPage.jsx       # Individual review view
│   │   │   ├── POVs.jsx           # POV reviews section
│   │   │   ├── Profile.jsx        # User profile page
│   │   │   ├── PublicFeed.jsx     # Community feed
│   │   │   ├── Recommendations.jsx # AI recommendations
│   │   │   ├── Register.jsx       # User registration
│   │   │   └── Trending.jsx       # Trending movies
│   │   ├── tests/                 # Frontend tests
│   │   │   ├── setup.js           # Test configuration
│   │   │   └── App.test.jsx       # Component tests
│   │   ├── utils/                 # Utility functions
│   │   ├── App.jsx                # Main app component
│   │   └── main.jsx               # Application entry point
│   ├── .env                       # Environment variables
│   ├── eslint.config.js           # ESLint configuration
│   ├── package.json               # Dependencies and scripts
│   ├── tailwind.config.js         # Tailwind CSS config
│   ├── vite.config.js             # Vite build configuration
│   └── vitest.config.js           # Vitest test configuration
│
├── server/                         # Node.js Backend
│   ├── middleware/                 # Express middleware
│   │   ├── auth.js                # JWT authentication middleware
│   │   ├── rateLimit.js           # Rate limiting middleware
│   │   └── validation.js          # Input validation middleware
│   ├── models/                    # Mongoose data models
│   │   ├── Activity.js            # User activity model
│   │   ├── Comment.js             # Comment model
│   │   ├── Entry.js               # Movie review entry model
│   │   └── User.js                # User account model
│   ├── routes/                    # API route handlers
│   │   ├── activity.js            # Activity feed routes
│   │   ├── auth.js                # Authentication routes
│   │   ├── comments.js            # Comment management routes
│   │   ├── entries.js             # Review entry routes
│   │   ├── recommendations.js     # AI recommendation routes
│   │   ├── tmdb.js                # TMDB API routes
│   │   ├── trending.js            # Trending content routes
│   │   └── users.js               # User management routes
│   ├── services/                  # Business logic services
│   │   ├── embeddingService.js    # Text embedding for ML
│   │   ├── recommendationEngine.js # AI recommendation logic
│   │   └── similarityService.js   # Similarity calculation service
│   ├── tests/                     # Backend tests
│   │   ├── recommendationEngine.test.js # Engine unit tests
│   │   └── server.test.js         # API integration tests
│   ├── .env                       # Environment variables
│   ├── index.js                   # Server entry point
│   └── package.json               # Dependencies and scripts
│
├── .gitignore                     # Git ignore rules
├── README.md                      # Project documentation
├── fix_genre.py                   # Python utility scripts
└── update_genre.py
```

## 🚀 Getting Started

### Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v7.0 or higher) - [Download here](https://www.mongodb.com/)
- **Git** - [Download here](https://git-scm.com/)
- **API Keys**:
  - OMDb API key from [omdbapi.com](http://www.omdbapi.com/)
  - TMDB API key from [themoviedb.org](https://www.themoviedb.org/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MyPOV
   ```

2. **Set up the backend**
   ```bash
   cd server

   # Install dependencies
   npm install

   # Create environment file
   cp .env.example .env
   ```

3. **Configure backend environment variables**
   Edit `server/.env`:
   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017/mypov

   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

   # External APIs
   OMDB_KEY=your-omdb-api-key-here
   TMDB_API_KEY=your-tmdb-api-key-here

   # Server Configuration
   CLIENT_URL=http://localhost:5173
   PORT=5000
   NODE_ENV=development
   ```

4. **Set up the frontend**
   ```bash
   cd ../client

   # Install dependencies
   npm install

   # Create environment file
   cp .env.example .env
   ```

5. **Configure frontend environment variables**
   Edit `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_TMDB_API_KEY=your-tmdb-api-key-here
   ```

### Database Setup

1. **Start MongoDB**
   ```bash
   # Using MongoDB Community Server
   mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Initialize the database**
   The application will automatically create collections and indexes when it starts.

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server will be available at `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   Frontend will be available at `http://localhost:5173`

3. **Open your browser**
   Navigate to `http://localhost:5173` to start using MyPOV!

## 🧪 Testing

### Backend Tests
```bash
cd server
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

### Frontend Tests
```bash
cd client
npm test              # Run all tests
npm run test:ui       # Run tests with UI
```

### Test Coverage
- **Backend**: Jest with Supertest for API endpoint testing
- **Frontend**: Vitest with React Testing Library for component testing
- **Integration**: End-to-end API flow testing

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### POST `/api/auth/login`
Authenticate and receive JWT token.
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Movie Entry Endpoints

#### GET `/api/entries`
Get user's movie entries (requires authentication).
- Query parameters: `page`, `limit`, `sort`

#### POST `/api/entries`
Create a new movie review entry.
```json
{
  "title": "The Shawshank Redemption",
  "tmdbId": "tt0111161",
  "rating": 10,
  "review": "A masterpiece of storytelling...",
  "date": "2024-01-15",
  "type": "movie",
  "genres": ["Drama", "Crime"],
  "pov": true,
  "isPublic": true
}
```

#### PUT `/api/entries/:id`
Update an existing movie entry.

#### DELETE `/api/entries/:id`
Delete a movie entry.

### Recommendation Endpoints

#### GET `/api/recommendations`
Get personalized movie recommendations.
- Query parameters: `limit` (default: 10)

### User Management Endpoints

#### GET `/api/users/:username`
Get public user profile information.

#### PUT `/api/users/profile`
Update user profile (requires authentication).

#### GET `/api/users/:id/follow`
Follow a user.

#### DELETE `/api/users/:id/unfollow`
Unfollow a user.

### Social Features

#### GET `/api/activity`
Get user's activity feed.

#### GET `/api/public`
Get public community feed.
- Query parameters: `page`, `limit`

#### GET `/api/trending`
Get trending movies and reviews.

#### POST `/api/comments`
Add a comment to a review.

#### PUT `/api/comments/:id`
Update a comment.

#### DELETE `/api/comments/:id`
Delete a comment.

### External API Integration

#### GET `/api/tmdb/search`
Search movies using TMDB API.
- Query parameters: `query`, `page`

#### GET `/api/tmdb/movie/:id`
Get detailed movie information from TMDB.

## 🗄️ Database Schema

### User Model
```javascript
{
  username: String (required, unique, 3-20 chars),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  bio: String (optional, max 500 chars),
  avatar: String (optional, URL),
  followers: [ObjectId] (references User),
  following: [ObjectId] (references User),
  createdAt: Date,
  updatedAt: Date
}
```

### Entry Model (Movie Review)
```javascript
{
  user: ObjectId (required, references User),
  title: String (required, max 200 chars),
  tmdbId: String (IMDb/TMDB ID),
  poster: String (image URL),
  backdrop: String (image URL),
  rating: Number (required, 1-10),
  review: String (max 5000 chars),
  date: String (required, watch date),
  type: String (enum: 'movie', 'tv'),
  genres: [String],
  language: String,
  pov: Boolean (default: false),
  isPublic: Boolean (default: false),
  likes: [ObjectId] (references User),
  createdAt: Date,
  updatedAt: Date
}
```

### Activity Model
```javascript
{
  user: ObjectId (required, references User),
  type: String (enum: 'review', 'like', 'follow', 'comment'),
  targetUser: ObjectId (references User),
  targetEntry: ObjectId (references Entry),
  description: String,
  createdAt: Date
}
```

### Comment Model
```javascript
{
  user: ObjectId (required, references User),
  entry: ObjectId (required, references Entry),
  content: String (required, max 1000 chars),
  likes: [ObjectId] (references User),
  createdAt: Date,
  updatedAt: Date
}
```

## 🤖 Recommendation Engine

### How It Works

1. **Taste Profile Creation**: Analyzes user's rated movies and reviews
2. **Content-Based Filtering**: Uses TF-IDF vectorization on movie genres, keywords, and reviews
3. **Similarity Calculation**: Cosine similarity between user preferences and movie features
4. **Hybrid Scoring**: Combines multiple factors:
   - Genre matching (35% weight)
   - Content recency (25% weight)
   - Text similarity (20% weight)
   - Keyword affinity (10% weight)
   - Community rating (10% weight)

### Algorithm Details

- **Text Processing**: Natural language processing with the Natural library
- **Vectorization**: TF-IDF transformation for text features
- **Similarity Metrics**: Cosine similarity for content matching
- **Caching**: 15-minute cache for search results, 1-hour cache for movie details
- **Concurrency**: Parallel API calls (up to 6 concurrent requests)

## 🔧 Development

### Code Style
- **ESLint**: Configured for React and Node.js best practices
- **Prettier**: Code formatting (integrated with ESLint)
- **ES Modules**: Modern import/export syntax throughout

### Environment Variables
- **Development**: Local MongoDB, debug logging
- **Production**: Cloud MongoDB, secure secrets, optimized caching

### Performance Optimizations
- **Database Indexing**: Optimized queries with compound indexes
- **API Caching**: Redis-ready caching layer (planned)
- **Lazy Loading**: Component and route-based code splitting
- **Image Optimization**: Responsive images with WebP support

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set secure JWT secret (256-bit minimum)
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure rate limiting for production load
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database

### Docker Deployment (Planned)
```dockerfile
# Multi-stage build for optimized production images
FROM node:18-alpine AS builder
# Build steps...

FROM node:18-alpine AS runtime
# Runtime configuration...
```

### Environment Configuration
```env
# Production Environment Variables
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/mypov
JWT_SECRET=your-production-jwt-secret
OMDB_KEY=your-production-omdb-key
CLIENT_URL=https://yourdomain.com
PORT=5000
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   cd server && npm test
   cd ../client && npm test
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and patterns
- Write tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR
- Use meaningful commit messages

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OMDb API** for movie data
- **TMDB** for additional movie information
- **Natural** library for NLP processing
- **React** and **Node.js** communities
- **Open source contributors**

## 📞 Support

If you have any questions or need help:

- **Issues**: [GitHub Issues](https://github.com/yourusername/mypov/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mypov/discussions)
- **Email**: support@mypov.com

---

**Made with ❤️ for movie lovers everywhere**