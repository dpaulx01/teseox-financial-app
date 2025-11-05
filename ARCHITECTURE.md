# 🏛️ Application Architecture

This document provides a high-level overview of the Artyco Financial App's architecture.

## System Components

The application is designed as a classic three-tier architecture, fully containerized for portability and consistent deployments.

1.  **Frontend**: A modern single-page application (SPA) built with **React** and **TypeScript**. It is responsible for rendering the user interface and providing all interactive elements. It communicates with the backend via HTTPS API calls.

2.  **Backend**: A robust API server built with **FastAPI** (Python). It handles all business logic, data processing, user authentication, and authorization (RBAC). It serves data to the frontend and connects to the database for data persistence.

3.  **Database**: A **MySQL** relational database that stores all application data, including users, roles, financial records, and sales transactions. In the cloud, this is managed by **Google Cloud SQL**.

## C4 Model: System Context Diagram

The following diagram illustrates the main components and their interactions:

```mermaid
graph TD
    A[Usuario] -->|Usa la aplicación web en su navegador| B(Frontend - React/Vite);
    B -->|Realiza llamadas API (HTTPS)| C(Backend - FastAPI);
    C -->|Lee/Escribe datos (SQL)| D(Base de Datos - MySQL);

    subgraph "Google Cloud Platform"
        C
        D
    end

    subgraph "Navegador del Usuario"
        B
    end

    style B fill:#58C1E0,stroke:#333,stroke-width:2px
    style C fill:#64B646,stroke:#333,stroke-width:2px
    style D fill:#DB7425,stroke:#333,stroke-width:2px
```

## Deployment Flow (Google Cloud)

1.  A developer pushes code to the `master` branch on GitHub.
2.  **Google Cloud Build** is triggered automatically.
3.  Cloud Build uses the `Dockerfile` to build a single, unified Docker image containing both the compiled frontend assets and the backend FastAPI application.
4.  The resulting image is pushed to **Google Container Registry (GCR)**.
5.  **Google Cloud Run** automatically deploys a new revision of the service using the new image from GCR.
6.  The application connects to the **Google Cloud SQL** instance for database services.
