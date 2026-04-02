# AutoPlan Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure MongoDB is running locally (or update `MONGODB_URI` in `.env`)

3. Start the server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/users` - List users (admin)
- `POST /api/auth/users` - Create user (admin)
- `PUT /api/auth/users/:id` - Update user (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)

### Protocols
- `POST /api/protocols` - Create protocol (requires JWT)
- `GET /api/protocols` - Get user protocols (requires JWT)
- `GET /api/protocols/:id` - Get single protocol (requires JWT)

## Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)
