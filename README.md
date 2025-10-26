# Artyco Financial App - Comprehensive Documentation

## 1. Project Overview

The Artyco Financial App is a full-stack web application designed for advanced financial analysis, reporting, and data visualization. It integrates a sophisticated AI-powered "Brain System" to offer intelligent insights, risk assessment, and automated financial advice. The application is built with a modern architecture, featuring a React-based frontend, a Python/FastAPI backend, and a MySQL database, all containerized with Docker for streamlined development and deployment. A core feature of the application is its robust Role-Based Access Control (RBAC) system, ensuring secure data access and functionality tailored to different user roles.

## 2. Features

*   **Interactive Financial Dashboard:** Rich, interactive data visualizations and reports.
*   **AI Brain System:** An AI-powered assistant for financial analysis, risk assessment, and reporting.
*   **Role-Based Access Control (RBAC):** Granular control over application features and data based on user roles.
*   **Data Import/Export:** Support for importing data from CSV and Excel files.
*   **Financial Scenario Analysis:** Tools for creating and comparing different financial scenarios.
*   **Secure Authentication:** JWT-based authentication to protect user accounts and data.
*   **"Status Producción" Module:** A module for tracking the status of production orders.

## 3. Architecture

The application follows a microservices-oriented architecture, with three main components orchestrated by Docker Compose:

*   **Frontend:** A single-page application (SPA) built with **React** and **Vite**. It communicates with the backend via a REST API.
*   **Backend:** A **Python** API server built with the **FastAPI** framework. It handles business logic, data processing, and communication with the database. It also hosts the **AI Brain System**.
*   **Database:** A **MySQL** database for storing all application data, including user information, financial data, and RBAC policies.

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  React Frontend  │   │  FastAPI Backend │   │   MySQL Database │
│ (Vite)           │   │ (Python)         │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
        │                    ▲                      ▲
        │ (HTTP Requests)    │                      │
        └───────────────────►│ (Database Queries)   │
                             └─────────────────────►│
```

## 4. Technologies

### Frontend

*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS, Tremor
*   **Charting:** Chart.js, Recharts
*   **HTTP Client:** Axios
*   **Routing:** React Router

### Backend

*   **Framework:** FastAPI
*   **AI/ML:** Anthropic, OpenAI, Pandas, NumPy, Scikit-learn
*   **Database ORM:** SQLAlchemy
*   **Authentication:** PyJWT, Passlib
*   **Web Server:** Uvicorn

### Database

*   **Database:** MySQL 8.0

### DevOps

*   **Containerization:** Docker, Docker Compose

## 5. Getting Started

To run the application in a local development environment, you need to have Docker and Docker Compose installed.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd artyco-financial-app-rbac
    ```

2.  **Start the application:**
    ```bash
    docker-compose up --build
    ```

This command will build the Docker images for the frontend and backend services, start all the containers, and set up the necessary network connections.

The application will be available at the following URLs:

*   **Frontend:** `http://localhost:3001`
*   **Backend API:** `http://localhost:8001`
*   **API Docs:** `http://localhost:8001/docs`
*   **phpMyAdmin:** `http://localhost:8082`

### Default Credentials

*   **Username:** `admin`
*   **Password:** `admin123`

## 6. Development

### Code Style

*   **Python:** Black for code formatting, Flake8 for linting, and MyPy for type checking.
*   **TypeScript/JavaScript:** Prettier for code formatting.

### Running Tests

The project includes a testing suite for the backend. To run the tests, you can execute the following command:

```bash
docker-compose exec api-rbac pytest
```

## 7. AI Brain System

The AI Brain System is a core component of the application, providing intelligent financial analysis capabilities. It is designed with a modular architecture:

*   **Core:** The central logic of the AI brain.
*   **Memory:** Manages contextual memory for financial decisions.
*   **Tools:** A collection of specialized tools for financial analysis (e.g., calculators, file readers).
*   **Reasoning:** A reasoning engine for risk assessment and evaluation.
*   **Learning:** Adapts and learns from user feedback.

The Brain System is integrated into the FastAPI backend and can be accessed through dedicated API endpoints.

## 8. Role-Based Access Control (RBAC)

The application implements a comprehensive RBAC system to control access to different features and data. The RBAC system is configured in the database and managed through the backend API.

### Default Roles

*   **Admin:** Full access to all system features.
*   **Manager:** Access to financial management and analysis features.
*   **Analyst:** Access to data analysis and reporting features.
*   **Viewer:** Read-only access to most features.

### Permissions

Permissions are granular and assigned to roles. For example, the `Manager` role has permissions for `financial_data:read`, `financial_data:write`, and `pyg_analysis:execute`, while the `Analyst` role only has `financial_data:read` and `pyg_analysis:read`.

## 9. "Status Producción" Module

This module provides a real-time overview of production orders. Its key features include:

*   **Smart Quotation Upload:** Drag and drop PDF or Excel files to automatically parse quotation details.
*   **Interactive Matrix:** Edit delivery dates, operational status, production notes, and billing information.
*   **Integrated Payment Management:** Track advance payments and balances for each quotation.
*   **Visual Progress Tracking:** A dynamic progress bar based on the order's start and estimated delivery dates.

## 10. Troubleshooting

*   **Port in use:** Ensure that ports `3307`, `8001`, `3001`, and `8082` are free on your system.
*   **Container fails to start:** Check the container logs using `docker-compose logs <service-name>`.
*   **Database connection error:** Wait for the MySQL container to fully initialize before starting the other services.
*   **Invalid token:** Make sure the `JWT_SECRET_KEY` is the same in the frontend and backend configurations.
