# 🎬 MyPOV Frontend - React Movie Review Platform

[![React](https://img.shields.io/badge/React-19.2.4-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0.0-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.19-38B2AC.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-1.6.0-6E9F18.svg)](https://vitest.dev/)

The modern, responsive React frontend for MyPOV - a comprehensive movie review and recommendation platform. Built with React 19, Vite, and Tailwind CSS for optimal performance and developer experience.

## 🌟 Features

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface with Tailwind CSS
- **Responsive Layout**: Mobile-first design that works on all devices
- **Smooth Animations**: Subtle transitions and micro-interactions
- **Dark/Light Theme**: Adaptive theming (planned feature)
- **Progressive Web App**: Offline support and native app feel (planned)

### 🚀 Performance
- **Fast Loading**: Vite build tool for lightning-fast development
- **Code Splitting**: Route-based and component-based lazy loading
- **Optimized Bundles**: Tree-shaking and dead code elimination
- **Image Optimization**: Responsive images with lazy loading
- **Caching Strategy**: Service worker for static asset caching

### 🔧 Developer Experience
- **Hot Module Replacement**: Instant updates during development
- **TypeScript Ready**: Easy migration path to TypeScript
- **ESLint Integration**: Code quality and consistency
- **Testing Suite**: Vitest with React Testing Library
- **Modern Tooling**: Latest React 19 features and hooks

### 📱 User Experience
- **Single Page Application**: Fast navigation without page reloads
- **Real-time Search**: Debounced movie search with instant results
- **Form Validation**: Client-side validation with error handling
- **Loading States**: Skeleton screens and progress indicators
- **Error Boundaries**: Graceful error handling and recovery

## 🛠️ Tech Stack

### Core Framework
- **React 19.2.4** - Latest React with concurrent features
- **React Router v7** - Declarative routing with data loading
- **React DOM 19.2.4** - React rendering library

### Build & Development
- **Vite 8.0.0** - Fast build tool and dev server
- **ESLint 9.39.4** - Code linting and formatting
- **PostCSS 8.5.8** - CSS processing
- **Autoprefixer 10.4.27** - CSS vendor prefixing

### Styling
- **Tailwind CSS 3.4.19** - Utility-first CSS framework
- **Tailwind Line Clamp** - Text truncation utilities
- **Custom CSS** - Component-specific styles

### HTTP & API
- **Axios 1.13.6** - HTTP client for API communication
- **RESTful APIs** - Clean API integration patterns

### Testing
- **Vitest 1.6.0** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **jsdom 24.1.0** - DOM simulation for testing
- **@testing-library/jest-dom** - Custom Jest matchers

### Development Tools
- **@vitejs/plugin-react 6.0.0** - React plugin for Vite
- **@types/react & @types/react-dom** - TypeScript definitions
- **globals 17.4.0** - Global variables for ESLint

## 📁 Project Structure

```
client/
├── public/                      # Static assets
│   ├── favicon.ico             # App favicon
│   └── assets/                 # Images, fonts, etc.
├── src/
│   ├── api/                    # API client functions
│   │   ├── auth.js            # Authentication API calls
│   │   ├── entries.js         # Movie entry/review API calls
│   │   ├── recommendations.js # Recommendation API calls
│   │   ├── tmdb.js           # TMDB API integration
│   │   └── users.js          # User management API calls
│   ├── components/            # Reusable UI components
│   │   ├── Hero.jsx          # Landing page hero section
│   │   ├── HeroPOV.jsx       # POV-specific hero component
│   │   ├── Navbar.jsx        # Main navigation component
│   │   ├── PostCard.jsx      # Individual review card
│   │   └── PublicPostCard.jsx # Public feed review card
│   ├── pages/                # Page components (routes)
│   │   ├── Activity.jsx      # User activity feed page
│   │   ├── Dashboard.jsx     # User dashboard/home page
│   │   ├── Home.jsx          # Authenticated user home
│   │   ├── Landing.jsx       # Public landing page
│   │   ├── LogEntry.jsx      # Create/edit movie review
│   │   ├── Login.jsx         # User login page
│   │   ├── MoviePage.jsx     # Individual movie details
│   │   ├── PostPage.jsx      # Individual review details
│   │   ├── POVs.jsx          # POV reviews collection
│   │   ├── Profile.jsx       # User profile page
│   │   ├── PublicFeed.jsx    # Community public feed
│   │   ├── Recommendations.jsx # AI recommendations page
│   │   ├── Register.jsx      # User registration page
│   │   └── Trending.jsx      # Trending movies page
│   ├── tests/                # Test files
│   │   ├── setup.js          # Test configuration
│   │   └── App.test.jsx      # Component tests
│   ├── utils/                # Utility functions
│   │   └── helpers.js        # Common helper functions
│   ├── App.jsx               # Main app component
│   ├── App.css               # Global app styles
│   ├── index.css             # Global CSS (Tailwind imports)
│   └── main.jsx              # Application entry point
├── .env                      # Environment variables
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── package-lock.json        # Lockfile for dependencies
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.js           # Vite build configuration
├── vitest.config.js         # Vitest test configuration
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Backend Server** - MyPOV backend running on port 5000

### Installation

1. **Navigate to the client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env`:
   ```env
   # Backend API URL
   VITE_API_URL=http://localhost:5000/api

   # TMDB API Key (for movie data)
   VITE_TMDB_API_KEY=your-tmdb-api-key-here

   # Optional: Development settings
   VITE_APP_ENV=development
   ```

### Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to `http://localhost:5173`

The app will automatically reload when you make changes to the code.

### Building for Production

1. **Create production build**
   ```bash
   npm run build
   ```

2. **Preview production build**
   ```bash
   npm run preview
   ```

The built files will be in the `dist/` directory.

## 🧪 Testing

### Running Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode (during development)
npm run test:ui
```

### Test Configuration
- **Framework**: Vitest with jsdom environment
- **Testing Library**: React Testing Library for component testing
- **Setup**: Custom test setup in `src/tests/setup.js`
- **Coverage**: Test coverage reporting (planned)

### Writing Tests
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

## 📱 Pages & Components

### Core Pages

#### Landing Page (`/`)
- **Purpose**: Public landing page for new visitors
- **Features**: Hero section, feature highlights, call-to-action
- **Components**: `Hero.jsx`, `HeroPOV.jsx`

#### Authentication Pages
- **Login** (`/login`): User authentication
- **Register** (`/register`): New user registration
- **Features**: Form validation, error handling, redirect after login

#### Dashboard (`/dashboard`)
- **Purpose**: User's main dashboard after login
- **Features**: Recent reviews, quick actions, statistics
- **Components**: Custom dashboard widgets

#### Movie Management
- **Log Entry** (`/log`): Create/edit movie reviews
- **Movie Page** (`/movie/:key`): Individual movie details
- **Features**: Rich forms, image uploads, rating system

#### Social Features
- **Public Feed** (`/public`): Community reviews and activity
- **Profile** (`/user/:username`): User profiles and reviews
- **Activity** (`/activity`): Personal activity feed
- **POVs** (`/povs`): Special POV reviews section

#### Discovery
- **Recommendations** (`/recommendations`): AI-powered suggestions
- **Trending** (`/trending`): Popular movies and reviews

### Reusable Components

#### Navigation
- **Navbar**: Main navigation with user menu and search

#### Content Cards
- **PostCard**: Individual review display
- **PublicPostCard**: Community feed card with interactions

#### Layout Components
- **Hero**: Landing page hero sections
- **Loading**: Loading states and skeletons
- **Error**: Error boundaries and messages

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

### Tailwind Configuration (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1f2937',
        secondary: '#3b82f6',
        accent: '#10b981'
      }
    },
  },
  plugins: [],
}
```

### ESLint Configuration (`eslint.config.js`)
```javascript
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
```

## 🌐 API Integration

### API Client Structure
The `src/api/` directory contains all API client functions:

```javascript
// Example: src/api/auth.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const login = async (credentials) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
  return response.data;
};

export const register = async (userData) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
  return response.data;
};
```

### External APIs
- **TMDB API**: Movie data, images, and metadata
- **OMDb API**: Additional movie information (handled by backend)

### Error Handling
```javascript
// Global error handling in API calls
try {
  const response = await apiCall();
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized
    logout();
  }
  throw error;
}
```

## 🎨 Styling Guide

### Tailwind CSS Classes
- **Layout**: `flex`, `grid`, `container`, `mx-auto`
- **Spacing**: `p-4`, `m-2`, `space-x-4`
- **Colors**: `bg-blue-500`, `text-gray-700`, `border-red-300`
- **Typography**: `text-lg`, `font-bold`, `leading-tight`
- **Responsive**: `md:flex`, `lg:grid-cols-3`

### Custom CSS
Located in `src/index.css` and `src/App.css`:
```css
/* Custom utilities */
.text-gradient {
  @apply bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent;
}

.card-shadow {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### Component Styling Pattern
```jsx
const MyComponent = () => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">
      Component Title
    </h2>
    <p className="text-gray-600">
      Component content with Tailwind classes.
    </p>
  </div>
);
```

## 🚀 Deployment

### Build Process
1. **Environment Setup**: Set production environment variables
2. **Build Command**: `npm run build`
3. **Static Files**: Serve `dist/` directory with any static server
4. **API Proxy**: Configure reverse proxy to backend API

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production API URLs
- [ ] Enable service worker (when implemented)
- [ ] Optimize images and assets
- [ ] Set up error monitoring
- [ ] Configure CDN for static assets

### Example Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🤝 Contributing

### Development Workflow
1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Make Changes**: Implement your feature
3. **Run Tests**: `npm test`
4. **Lint Code**: `npm run lint`
5. **Commit Changes**: `git commit -m 'Add new feature'`
6. **Push Branch**: `git push origin feature/new-feature`
7. **Create PR**: Open pull request for review

### Code Standards
- **Component Naming**: PascalCase for components
- **File Naming**: camelCase for utilities, PascalCase for components
- **Imports**: Group imports (React, third-party, local)
- **Props**: Use destructuring and default values
- **State**: Prefer hooks over class components

### Component Template
```jsx
import { useState, useEffect } from 'react';

const MyComponent = ({ prop1, prop2 = 'default' }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Component logic
  }, []);

  return (
    <div className="my-component">
      {/* Component JSX */}
    </div>
  );
};

export default MyComponent;
```

## 📊 Performance

### Optimization Techniques
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Responsive images with lazy loading
- **Bundle Analysis**: Use `vite-bundle-analyzer` for bundle size
- **Memoization**: `React.memo` for expensive components
- **Virtual Scrolling**: For large lists (planned)

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Bundle Size**: < 200KB gzipped

## 🔧 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Environment Variables Not Loading
```bash
# Check if .env file exists and has correct format
cat .env
# Restart dev server after changing .env
npm run dev
```

#### API Connection Issues
```bash
# Check if backend is running
curl http://localhost:5000/health
# Verify VITE_API_URL in .env
echo $VITE_API_URL
```

#### Test Failures
```bash
# Clear test cache
npm test -- --clearCache
# Run specific test
npm test MyComponent.test.jsx
```

## 📚 Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router v7](https://reactrouter.com/)

### Tools & Libraries
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Axios Documentation](https://axios-http.com/docs/intro)

### Community
- [React Discord](https://discord.gg/reactiflux)
- [Vite Discord](https://chat.vitejs.dev/)
- [Tailwind CSS Discord](https://tailwindcss.com/discord)

---

**Built with ❤️ using React 19 and modern web technologies**
