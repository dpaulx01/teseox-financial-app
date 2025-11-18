# 🏢 Teseox Financial App - RBAC System

A comprehensive financial management platform (rebranded as Teseox) with advanced analytics, production tracking, and role-based access control (RBAC).

## 🌟 Features

### 💼 Financial Management
- **P&L Analysis**: Complete Profit & Loss analysis with vertical and horizontal views
- **Break-Even Analysis**: Advanced break-even calculations with scenario modeling
- **KPI Dashboard**: Customizable financial KPIs with real-time tracking
- **What-If Scenarios**: Financial projections and scenario simulation

### 📊 Sales Business Intelligence
- **Sales Analytics**: Comprehensive sales data analysis with interactive charts
- **Pareto Analysis**: ABC classification and Pareto charts for product/client analysis
- **Ranking Dashboard**: Top performers tracking (products, clients, sellers)
- **Commercial & Financial Views**: Dual-perspective analysis for decision making

### 🏭 Production Management
- **Production Status**: Real-time production tracking and monitoring
- **Stock Planning**: Inventory management and planning tools
- **Production Calendar**: Visual production scheduling and timeline
- **Operational KPIs**: Key performance indicators for production efficiency

### 🔐 Security & Access Control
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **User Management**: Complete user administration panel
- **JWT Authentication**: Secure token-based authentication
- **Multi-role Support**: Admin, User, Viewer roles with custom permissions

### 🤖 AI-Powered Insights (Optional)
- **Financial Brain**: AI-powered financial analysis using Anthropic Claude
- **Intelligent Suggestions**: Automated insights and recommendations
- **Pattern Recognition**: Anomaly detection and trend analysis

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 4
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Chart.js, Recharts
- **State Management**: React Context API
- **Routing**: React Router v6

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: MySQL 8.0
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT with PassLib
- **API Docs**: Automatic OpenAPI/Swagger

### DevOps & Deployment
- **Containerization**: Docker & Docker Compose
- **Cloud**: Google Cloud Run (recommended)
- **Database**: Cloud SQL for MySQL
- **CI/CD**: GitHub Actions

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- MySQL 8.0 (or Docker)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/artyco-financial-app-rbac.git
   cd artyco-financial-app-rbac
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

4. **Install Backend Dependencies**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Setup Database**
   ```bash
   # Using Docker (recommended for development)
   docker-compose up -d mysql

   # Run migrations
   mysql -u root -p < sql/01-create-financial-tables.sql
   mysql -u root -p < sql/02-create-raw-table.sql
   mysql -u root -p < sql/03-rbac-schema.sql
   # ... (continue with other SQL files)
   ```

6. **Start Development Servers**

   Terminal 1 - Backend:
   ```bash
   source .venv/bin/activate
   python api_server_rbac.py
   ```

   Terminal 2 - Frontend:
   ```bash
   npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:3001
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Default Credentials
```
Username: admin
Password: admin
```
**⚠️ IMPORTANT:** Change these credentials immediately in production!

## 📁 Project Structure

```
artyco-financial-app-rbac/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   ├── contexts/                 # React Context providers
│   ├── modules/                  # Feature modules
│   │   ├── salesBI/             # Sales Business Intelligence
│   │   └── statusProduccion/    # Production Management
│   ├── pages/                    # Page components
│   └── services/                 # API services
├── routes/                       # FastAPI route handlers
│   ├── auth.py                  # Authentication endpoints
│   ├── users.py                 # User management
│   ├── financial_data.py        # Financial data APIs
│   └── sales_bi_api.py          # Sales BI APIs
├── database/                     # Database models & connection
├── auth/                         # Authentication utilities
├── brain/                        # AI Brain system (optional)
├── sql/                          # Database schemas and migrations
├── deploy/                       # Deployment configurations
├── api_server_rbac.py           # Main FastAPI application
├── config.py                    # Application configuration
└── requirements.txt             # Python dependencies
```

## 🔧 Configuration

### Environment Variables
All configuration is done via environment variables. See `.env.example` for a complete list.

Key variables:
- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET_KEY`: Secret for JWT tokens (generate with `openssl rand -hex 32`)
- `VITE_API_BASE_URL`: Frontend API endpoint
- `ANTHROPIC_API_KEY`: For AI features (optional)

### Database Configuration
The app supports multiple database configurations:
- **Local/Docker**: MySQL on localhost
- **Cloud SQL**: Google Cloud SQL for MySQL
- **Remote MySQL**: Any remote MySQL instance

## 🐳 Docker Deployment

### Using Docker Compose (Development)
```bash
docker-compose up -d
```

This starts:
- MySQL database
- phpMyAdmin (optional)
- Application containers

### Building for Production
```bash
# Build frontend
npm run build

# Build Docker image
docker build -t artyco-financial-app .

# Run container
docker run -p 8000:8000 --env-file .env artyco-financial-app
```

## ☁️ Cloud Deployment (Google Cloud Run)

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed cloud deployment instructions.

Quick overview:
1. Build Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Configure Cloud SQL connection
5. Set environment variables
6. Configure custom domain

## 📊 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

**Financial Data:**
- `GET /api/financial/data` - Get financial data
- `POST /api/financial/upload` - Upload financial CSV
- `GET /api/financial/kpis` - Get KPIs

**Sales BI:**
- `GET /api/sales-bi/summary` - Sales summary
- `GET /api/sales-bi/rankings` - Product/client rankings
- `GET /api/sales-bi/pareto` - Pareto analysis

**Production:**
- `GET /api/production/status` - Production status
- `GET /api/production/kpis` - Production KPIs

## 🧪 Testing

```bash
# Backend tests
pytest

# Frontend tests (if configured)
npm test
```

## 🔒 Security

- JWT-based authentication with secure token handling
- Password hashing with bcrypt
- CORS configuration for API security
- SQL injection prevention via SQLAlchemy ORM
- Environment-based secrets management
- Role-based access control (RBAC)

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a private project. For internal contributions:

1. Create a feature branch
2. Make your changes
3. Submit a pull request
4. Wait for code review

## 📧 Support

For issues or questions, please contact the development team.

## 🎯 Roadmap

- [ ] Advanced AI-powered forecasting
- [ ] Multi-company support
- [ ] Mobile responsive improvements
- [ ] Export to Excel/PDF enhancements
- [ ] Real-time collaboration features
- [ ] Advanced reporting templates

---

**Built with ❤️ for financial excellence**
