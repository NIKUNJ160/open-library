# Universal Open Knowledge Search Engine

A high-performance, aggregated knowledge search engine API that federates queries across 22+ open-access data sources, categorizing results into Books, Research Papers, Datasets, Patents, Repositories, Government publications, and Documentation. Built with NestJS, TypeScript, Redis, and OpenAI, providing a unified REST API for open knowledge retrieval.

---

## 🏛️ Architecture

```mermaid
graph TD;
    Client([Client]) -->|HTTP GET /search| API Gateway(NestJS API Controller);
    API Gateway -->|x-api-key| Auth(AuthGuard);
    Auth --> Cache(Redis CacheInterceptor);
    
    Cache -->|Cache Miss| Aggregator(SearchAggregatorService);
    
    Aggregator -->|Parallel Requests| Connectors((Connectors Module));
    
    subgraph Connectors Module
        Books[Books Connectors<br/>OpenLibrary, Gutenberg, etc.]
        Papers[Papers Connectors<br/>OpenAlex, arXiv, etc.]
        Datasets[Datasets Connectors<br/>Kaggle, HuggingFace, etc.]
        Patents[Patents Connectors<br/>Google Patents, USPTO, etc.]
        Repos[Repos Connectors<br/>GitHub]
        Gov[Gov Connectors<br/>NASA, WorldBank]
        Docs[Docs Connectors<br/>MDN]
    end
    
    Connectors -.-> Books
    Connectors -.-> Papers
    Connectors -.-> Datasets
    Connectors -.-> Patents
    Connectors -.-> Repos
    Connectors -.-> Gov
    Connectors -.-> Docs
    
    Books -.-> ExternalAPI[External APIs]
    Papers -.-> ExternalAPI
    Datasets -.-> ExternalAPI
    Patents -.-> ExternalAPI
    Repos -.-> ExternalAPI
    Gov -.-> ExternalAPI
    Docs -.-> ExternalAPI
    
    Aggregator -->|Filter & Pagination| Response(Unified Response DTO);
    Response --> CacheSetter(Cache Set);
    CacheSetter --> API Gateway;
    API Gateway --> Client;
```

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v10
- **Language**: [TypeScript](https://www.typescriptlang.org/) v5
- **Caching**: [Redis](https://redis.io/) (via `ioredis` and `cache-manager`)
- **API Documentation**: [Swagger](https://swagger.io/) (OpenAPI 3.0) via `@nestjs/swagger`
- **Validation**: `class-validator` and `class-transformer`
- **HTTP Client**: Axios (via `@nestjs/axios`)
- **Logging**: Custom Winston-like structured logger with Correlation IDs
- **AI Integration**: OpenAI (for intelligent query parsing - optional based on env)

---

## 📋 Prerequisites

Ensure you have the following installed before starting:
- **Node.js**: v18.x or higher
- **npm** or **yarn**
- **Redis Server**: v6.x or higher (running locally or remotely)
- **OpenAI API Key**: (Optional) for advanced query intent parsing

---

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository_url>
   cd universal_search_engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and copy the contents from `.env.example` (if available) or use the reference below:
   ```env
   # Application
   PORT=3000
   NODE_ENV=development
   API_KEY=your_secure_api_key_here

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # External APIs
   OPENAI_API_KEY=sk-your-openai-key
   GITHUB_TOKEN=ghp_your_github_token
   # Add other connector specific tokens here...
   ```

4. **Start the Application**
   ```bash
   # Development mode with watch
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

---

## 🔧 Environment Variables Reference

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `PORT` | `number` | Port on which the API runs | `3000` |
| `NODE_ENV` | `string` | Environment (`development`, `production`) | `development` |
| `API_KEY` | `string` | Secret key required for authentication via `x-api-key` header | `null` |
| `REDIS_HOST` | `string` | Redis server hostname | `localhost` |
| `REDIS_PORT` | `number` | Redis server port | `6379` |
| `REDIS_PASSWORD` | `string` | Redis server password | `null` |
| `OPENAI_API_KEY` | `string` | Key for OpenAI API | `null` |

---

## 📡 API Endpoints

### Base URL: `http://localhost:3000/api/v1`
**Authentication**: All endpoints (except docs and health) require the `x-api-key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search` | Aggregates search results across all configured connectors. Supports advanced filtering (author, year, category, source, pagination). |
| `GET` | `/health` | Application health check. Returns `200 OK` if the app is healthy. |

**Swagger UI**: Available at `http://localhost:3000/api/docs`

### Example Search Request
```bash
curl -X GET "http://localhost:3000/api/v1/search?q=machine%20learning&category=papers&limit=5" \
     -H "x-api-key: your_secure_api_key_here"
```

---

## 🔌 Data Source Connectors (22 Supported)

The system federates searches across the following categories and sources:

### 📚 Books
- OpenLibrary
- Project Gutenberg
- Google Books
- Internet Archive

### 📄 Research Papers
- OpenAlex
- CORE
- Semantic Scholar
- arXiv
- PubMed
- Europe PMC
- DOAJ (Directory of Open Access Journals)

### 📊 Datasets
- Kaggle
- Hugging Face
- Data.gov
- Zenodo

### 💡 Patents
- Google Patents
- USPTO (United States Patent and Trademark Office)
- WIPO (World Intellectual Property Organization)

### 💻 Repositories
- GitHub

### 🏛️ Government Publications
- NASA
- World Bank

### 📖 Documentation
- MDN Web Docs

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run start` | Start the application |
| `npm run start:dev` | Start the app in watch mode (auto-reload) |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm run test` | Run unit tests using Jest |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests and generate coverage report |
| `npm run lint` | Run ESLint (ensure to add to package.json scripts if needed) |

---

## 📁 Project Structure

```
universal_search_engine/
├── src/
│   ├── auth/                # API Key Guard and Auth modules
│   ├── cache/               # Redis integration and cache interceptors
│   ├── common/              # Shared middlewares (SEO, ResponseTime), filters, logger
│   ├── connectors/          # 22+ Data source implementations
│   │   ├── books/
│   │   ├── datasets/
│   │   ├── docs/
│   │   ├── gov/
│   │   ├── papers/
│   │   ├── patents/
│   │   └── repos/
│   ├── health/              # Health check endpoints
│   ├── search/              # Core Search Aggregator logic, DTOs, Controllers
│   ├── app.module.ts        # Root module
│   └── main.ts              # Entry point & Bootstrap
├── test/                    # E2E Tests
├── package.json
└── tsconfig.json
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🐳 Docker Deployment

The Universal Search Engine can be easily deployed using Docker and Docker Compose, which spins up the NestJS API, a Redis cache, and an Nginx server for the frontend.

### Quick Start (One-Command Deployment)

To build and launch the entire production-grade stack (pgvector PostgreSQL, Redis 7, NestJS API, and compiled Nginx frontend) in a single command, run:

```bash
docker-compose up -d --build
```

### Accessing the Services
Once started:
- **Frontend App**: [http://localhost:8080](http://localhost:8080)
- **API Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) (or Nginx routed: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health))
- **Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Local DB Link**: Mapped to host port `5433` (container running Postgres 16 on `5432`).
- **Local Redis Link**: Mapped to host port `6380` (container running Redis 7 on `6379`).

---

## ☁️ Coolify Production Deployment

To deploy this entire stack to your VPS using **Coolify**:

1. **Create a New Project**: Inside Coolify, select **Deploy New Application** and choose **Docker Compose**.
2. **Repository & Branch**: Point it to your repository URL (`main` branch).
3. **Paste Docker Compose Configuration**: Paste the contents of [`docker-compose.yml`](file:///d:/books/universal_search_engine/docker-compose.yml).
4. **Configure Environment Variables**: In the Coolify environment settings, add the required secrets:
   - `NVIDIA_API_KEY`: Your Nvidia NIM API key.
   - `NVIDIA_BASE_URL`: `https://integrate.api.nvidia.com/v1`
   - `NVIDIA_MODEL`: `openai/gpt-oss-120b`
   - `DB_PASSWORD`: A secure production database password.
   - `API_KEY`: The master api token for authorization headers.
5. **Deploy**: Click **Deploy**. Coolify will build the backend and frontend containers, spin up pgvector and Redis, link them dynamically, and expose the Nginx web portal on port `8080` (which Coolify can map to a domain name with automatic Let's Encrypt SSL certificates!).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
