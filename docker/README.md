# Docker Setup Guide

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## PostgreSQL Connection Issues

If you see errors like:
```
FATAL: password authentication failed for user "postgres"
DETAIL: Role "postgres" does not exist.
```

This usually means there's an old PostgreSQL volume with a different user configuration. To fix:

```bash
# Stop containers
docker-compose down

# Remove the PostgreSQL volume
docker volume rm data-modelling-api_postgres_data

# Or remove all volumes
docker-compose down -v

# Restart containers (will recreate volume with correct user)
docker-compose up -d
```

**Note**: Removing volumes will delete all database data. Make sure to backup if needed.

## Configuration

### Environment Variables

Create a `docker-compose.override.yml` file (it's gitignored) to override settings:

```yaml
services:
  api:
    environment:
      GITHUB_CLIENT_ID: your-client-id
      GITHUB_CLIENT_SECRET: your-client-secret
      JWT_SECRET: your-secure-jwt-secret-at-least-32-characters-long
      RUST_LOG: debug
```

### PostgreSQL Credentials

Default credentials (set in `docker-compose.yml`):
- User: `data_modelling`
- Password: `data_modelling_password`
- Database: `data_modelling`

To change these, update `docker-compose.yml` and recreate the volume.

## Troubleshooting

### API won't start
- Check PostgreSQL is healthy: `docker-compose ps`
- Check API logs: `docker-compose logs api`
- Verify `JWT_SECRET` is at least 32 characters

### Frontend can't connect to API
- Verify API is healthy: `curl http://localhost:8081/api/v1/health`
- Check Nginx logs: `docker-compose logs frontend`
- Verify `VITE_API_BASE_URL` is empty (uses relative URLs)
- Access frontend at: `http://localhost:5173`

### Database connection errors
- Verify PostgreSQL is running: `docker-compose ps postgres`
- Check connection string matches credentials
- Use port 5433 to connect from outside Docker: `postgresql://data_modelling:data_modelling_password@localhost:5433/data_modelling`
- Recreate volume if user mismatch (see above)

## Network

All services are on the `data-modelling-network` bridge network:
- `postgres:5432` - PostgreSQL database
- `api:8081` - API service
- `frontend:80` - Frontend (Nginx)

## Volumes

- `postgres_data` - PostgreSQL data directory
  - Location: `/var/lib/postgresql/data/pgdata`
  - Persists database data between container restarts

## Health Checks

- **PostgreSQL**: `pg_isready -U data_modelling` (every 10s)
- **API**: `curl -f http://localhost:8081/api/v1/health` (every 30s)
- **Frontend**: Depends on API health check

## Ports

- `5433` - PostgreSQL (host → container, container port 5432)
- `8082` - API (host → container, container port 8081)
- `5174` - Frontend (host → container, mapped to container port 80)

**Note**: These are alternative ports to avoid conflicts with other services. The container internal ports remain unchanged.

## Development

For local development with hot reload, uncomment volumes in `docker-compose.override.yml`:

```yaml
frontend:
  volumes:
    - ./frontend/src:/app/src:ro
```

Note: This requires the frontend Dockerfile to support volume mounting.
