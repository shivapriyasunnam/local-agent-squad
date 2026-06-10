# Database Setup

## Stack
- **PostgreSQL 17** via Homebrew
- **pgvector 0.8.2** extension (for future RAG support)
- **SQLAlchemy 2.0** ORM
- **psycopg2-binary** driver

## Start the database

```bash
brew services start postgresql@17
```

## Connection details

| Field    | Value       |
|----------|-------------|
| Host     | localhost   |
| Port     | 5432        |
| User     | agent       |
| Password | none        |
| Database | agentsquad  |

Connection string (in `server/.env`):
```
DATABASE_URL=postgresql://agent@localhost:5432/agentsquad
```

## Schema

### `agents` table

| Column          | Type         | Notes                          |
|-----------------|--------------|--------------------------------|
| id              | SERIAL       | Primary key                    |
| is_multi_model  | BOOLEAN      | True if agent uses multiple models |
| model           | VARCHAR(100) | Single model id (null if multi) |
| models          | TEXT[]       | Array of model ids (null if single) |
| max_tokens      | INTEGER      | Max response token limit       |
| created_at      | TIMESTAMP    | Auto-set on insert             |
| updated_at      | TIMESTAMP    | Auto-set on insert, updated on edit |

Tables are created automatically when the server starts via `Base.metadata.create_all()`.

## pgvector

The `vector` extension is already installed and enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

No vector columns exist yet — they will be added when RAG is implemented.

## First-time setup (already done)

```bash
# Install
brew install postgresql@17
brew install pgvector

# Copy pgvector extension files into PostgreSQL 17
cp /opt/homebrew/Cellar/pgvector/0.8.2/share/postgresql@17/extension/* \
   /opt/homebrew/opt/postgresql@17/share/postgresql/extension/
cp /opt/homebrew/Cellar/pgvector/0.8.2/lib/postgresql@17/* \
   /opt/homebrew/opt/postgresql@17/lib/postgresql/

# Start and create database
brew services start postgresql@17
createuser -s agent
createdb -U agent agentsquad
psql -U agent -d agentsquad -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
