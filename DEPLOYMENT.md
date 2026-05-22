# MyPOV Deployment

## Backend environment variables

Set these in your backend host before starting the server:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@HOST/mypov?retryWrites=true&w=majority
JWT_SECRET=use-a-random-secret-at-least-32-characters
ADMIN_CODE=use-a-random-admin-invite-code
OMDB_KEY=your-omdb-api-key
TMDB_KEY=your-tmdb-api-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=https://your-frontend-domain.com
PORT=5000
NODE_ENV=production
```

`CLIENT_URL` may contain multiple comma-separated origins if your host uses preview URLs.

## Frontend environment variables

Set this in your frontend host:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

If the frontend and backend are deployed under the same domain with `/api` proxied to the backend, this can be omitted.

## Build and start commands

Backend:

```bash
npm install
npm start
```

Frontend:

```bash
npm install
npm run build
```

## Health check

Use:

```text
https://your-backend-domain.com/api/health
```

## Before public launch

Rotate the old MongoDB password, OMDb key, TMDB key, Gemini key, JWT secret, and admin code. They were present in local files and should be treated as exposed.
