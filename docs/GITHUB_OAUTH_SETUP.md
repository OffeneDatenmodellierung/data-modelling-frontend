# GitHub OAuth Setup Guide

## Callback URL Configuration

The GitHub OAuth application needs to be configured with the correct callback URL based on your deployment:

### Docker Deployment (Current Setup)

**Callback URL**: `http://localhost:8082/api/v1/auth/github/callback`

**Note**: The API container runs on port `8081` internally, but is mapped to port `8082` on the host.

### Local Development (Non-Docker)

**Callback URL**: `http://localhost:8081/api/v1/auth/github/callback`

## How to Update GitHub OAuth App Settings

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Select your OAuth application
3. Update the **Authorization callback URL** to match your deployment:
   - Docker: `http://localhost:8082/api/v1/auth/github/callback`
   - Local: `http://localhost:8081/api/v1/auth/github/callback`
4. Save the changes

## Port Configuration

### Docker (docker-compose.yml)
- **Host Port**: `8082` (external access)
- **Container Port**: `8081` (internal)
- **Mapping**: `8082:8081`

### Local Development
- **API Port**: `8081` (direct access)

## Important Notes

- The callback URL must exactly match what's configured in GitHub
- If you change ports, you must update the GitHub OAuth app settings
- The frontend uses relative URLs by default, so it will work with either port
- For production, use HTTPS and update the callback URL accordingly

## Troubleshooting

### "redirect_uri_mismatch" Error
- Check that the callback URL in GitHub matches exactly (including port)
- Verify the API is accessible on the configured port
- Check docker-compose.yml port mappings

### Callback Not Working
- Verify the API container is running: `docker-compose ps`
- Check API logs: `docker-compose logs api`
- Test API health: `curl http://localhost:8082/api/v1/health`



