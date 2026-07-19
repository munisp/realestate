# User Service

Enterprise-grade user authentication and authorization service with Keycloak integration.

## Features

- **Keycloak Integration**: Centralized identity and access management
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Fine-grained permission management
- **Session Management**: Redis-backed session storage
- **Event Publishing**: Kafka integration for user lifecycle events
- **PostgreSQL Storage**: Persistent user data storage

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  User Service   │
│   (Port 8081)   │
└────┬────┬───┬───┘
     │    │   │
     │    │   └──────────┐
     │    │              │
     ▼    ▼              ▼
┌─────┐ ┌──────────┐ ┌──────┐
│ DB  │ │ Keycloak │ │ Kafka│
└─────┘ └──────────┘ └──────┘
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### User Management

- `GET /api/v1/users` - List users (authenticated)
- `GET /api/v1/users/:id` - Get user by ID
- `GET /api/v1/users/me` - Get current user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Admin

- `GET /api/v1/admin/users` - List all users (admin only)
- `DELETE /api/v1/admin/users/:id` - Delete any user (admin only)

## Configuration

Environment variables:

```bash
# Server
USER_SERVER_PORT=:8081
USER_SERVER_MODE=release

# Database
USER_DATABASE_HOST=localhost
USER_DATABASE_PORT=5432
USER_DATABASE_USER=postgres
USER_DATABASE_PASSWORD=password
USER_DATABASE_DBNAME=realestate
USER_DATABASE_SSLMODE=disable

# Redis
USER_REDIS_HOST=localhost
USER_REDIS_PORT=6379
USER_REDIS_PASSWORD=

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=realestate
KEYCLOAK_CLIENT_ID=user-service
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# JWT
JWT_SECRET=your-secret-key

# Kafka
USER_KAFKA_BROKERS=localhost:9092
USER_KAFKA_TOPIC=user-events
USER_KAFKA_GROUPID=user-service
```

## Running Locally

```bash
# Install dependencies
go mod download

# Run the service
go run cmd/server/main.go
```

## Running with Docker

```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 8081:8081 \
  -e USER_DATABASE_HOST=postgres \
  -e KEYCLOAK_URL=http://keycloak:8080 \
  user-service
```

## Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...
```

## Events Published

### user.created
```json
{
  "event_type": "user.created",
  "user_id": "uuid",
  "timestamp": "2024-11-17T00:00:00Z",
  "data": { /* user object */ }
}
```

### user.updated
```json
{
  "event_type": "user.updated",
  "user_id": "uuid",
  "timestamp": "2024-11-17T00:00:00Z",
  "data": { /* user object */ }
}
```

### user.deleted
```json
{
  "event_type": "user.deleted",
  "user_id": "uuid",
  "timestamp": "2024-11-17T00:00:00Z",
  "data": { /* user object */ }
}
```

### user.logged_in
```json
{
  "event_type": "user.logged_in",
  "user_id": "uuid",
  "timestamp": "2024-11-17T00:00:00Z",
  "data": { /* user object */ }
}
```

## Security

- All passwords are hashed and stored in Keycloak
- JWT tokens expire after 1 hour
- Refresh tokens expire after 7 days
- CORS is enabled for cross-origin requests
- Role-based access control for admin endpoints

## Production Considerations

1. **Change JWT Secret**: Use a strong, random secret in production
2. **Enable SSL**: Set `USER_DATABASE_SSLMODE=require` for production
3. **Keycloak**: Configure proper Keycloak realm and client
4. **Rate Limiting**: Add rate limiting middleware
5. **Monitoring**: Add Prometheus metrics
6. **Logging**: Configure structured logging

## License

MIT
