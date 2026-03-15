# Telemetry-PWA-backend (old)
Backend service that secures access to the database and electric service

---
> [!WARNING]  
> This code is no longer used, as the backend infrastructure has changed to use cloudflare workers, and been combined into the original [Telemetry-PWA](https://github.com/cpsupermileage/Telemetry-PWA) repository.
---

## Setting up services

We need both a PostgreSQL db and an ElectricSQL sync engine running.

### Using [Coolify](https://coolify.io/) (recommended)

Create a project, add a resource, select "Docker Compose Empty", and paste in the following `docker-compose.yaml`:

```yaml
x-common-env: &common-env
  POSTGRES_USER: $SERVICE_USER_POSTGRES
  POSTGRES_PASSWORD: $SERVICE_PASSWORD_POSTGRES
  POSTGRES_DB: '${POSTGRES_DB:?telemetry}'
  ELECTRIC_SECRET: $SERVICE_PASSWORD_ELECTRIC

services:
  postgresql:
    image: 'postgres:16-alpine'
    volumes:
      - 'postgresql-data:/var/lib/postgresql/data'
    environment:
      <<: *common-env
    command:
      - '-c'
      - wal_level=logical
    healthcheck:
      test:
        - CMD-SHELL
        - 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}'
      interval: 5s
      timeout: 20s
      retries: 10
  electric:
    image: 'docker.io/electricsql/electric:latest'
    environment:
      <<: *common-env
      DATABASE_URL: 'postgres://$SERVICE_USER_POSTGRES:$SERVICE_PASSWORD_POSTGRES@postgresql:5432/$POSTGRES_DB?sslmode=disable'
    depends_on:
      postgresql:
        condition: service_healthy
    healthcheck:
      test:
        - CMD-SHELL
        - pwd
```

in coolify, make sure to check "connect to a predefined network" ([more info](https://coolify.io/docs/builds/packs/docker-compose#connect-to-predefined-networks)) to make this available to other services, such as this backend.

### NOT using Coolify

You can follow the [Electric recommended setup](https://electric-sql.com/docs/quickstart) or use their [cloud hosting](https://dashboard.electric-sql.cloud/) combined with [Neon](https://neon.com/) or another postgres host.

## Developing

- Copy `.env.example` to `.env` and edit the environment variables there

```sh
# Start the dev server
pnpm run dev


# Check types
pnpm run type-check

# Lint
pnpm run lint
# or
pnpm run lint:fix

# Prettier
pnpm run format
# or
pnpm run format:check

# Drizzle (https://orm.drizzle.team/docs/kit-overview)
pnpm run db:push
pnpm run db:migrate
pnpm run db:studio


# Build
pnpm run build

# Start
pnpm run start
```
