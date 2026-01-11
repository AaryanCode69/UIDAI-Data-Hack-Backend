# 🚀 Saarthi-Net – Backend (MVP)

> A data intelligence platform that leverages aggregated Aadhaar-like metadata to surface insights on migration patterns, peri-urban growth, and digital exclusion risks in India.

This repository contains the backend system responsible for storing ML-generated insights, enforcing secure access, and serving map-friendly APIs to the interactive dashboard.

---

## 🧭 Project Vision

India's rapid urbanization and digital transformation often leave policy blind spots. **Saarthi-Net** acts as a digital guide (_Saarthi_) for policymakers and researchers by answering:

- 📍 Where are people migrating, and at what intensity?
- 🏘️ Which rural regions are transitioning into peri-urban or urban zones?
- 📵 Where does Aadhaar exist but remain digitally unusable?

> This MVP demonstrates how **secure data access + geospatial intelligence** can support evidence-based governance.

---

## 🎯 Backend Responsibilities

This backend acts as the system backbone, connecting ML outputs to the visualization layer while enforcing controlled access.

### ✅ What this backend does

| Feature          | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| **Data Storage** | Stores processed ML outputs (migration, growth, risk scores) |
| **Geospatial**   | Uses PostGIS for geospatial data management                  |
| **Security**     | Implements authentication & authorization                    |
| **APIs**         | Exposes stable, read-only APIs                               |
| **Format**       | Returns GeoJSON for seamless map integration                 |

### ❌ What this backend does NOT do (by design)

- No ML inference
- No background jobs or streaming pipelines
- No write access to analytical data

---

## 🔐 Authentication & Security Model (MVP)

Authentication is implemented to ensure secure and controlled access to sensitive analytics.

### Auth Strategy

| Component               | Technology               |
| ----------------------- | ------------------------ |
| **Auth Provider**       | Supabase Auth            |
| **Auth Method**         | JWT-based authentication |
| **Backend Enforcement** | NestJS Guards            |
| **Scope**               | Read-only access to APIs |

### Authentication Flow

```
Frontend Login
      ↓
Supabase Auth (JWT issued)
      ↓
JWT sent in Authorization Header
      ↓
NestJS Auth Guard validates token
      ↓
Access to APIs
```

### API Access

- All analytical endpoints are protected
- Only authenticated users can access:
  - `/migration`
  - `/growth-zones`
  - `/digital-risk`

> ⚠️ **Privacy Notice:** No Aadhaar numbers or PII are stored or transmitted at any point.

---

## 🛠️ Tech Stack

| Layer                 | Technology            |
| --------------------- | --------------------- |
| **Framework**         | NestJS (TypeScript)   |
| **Database**          | PostgreSQL (Supabase) |
| **Geospatial Engine** | PostGIS               |
| **Authentication**    | Supabase Auth (JWT)   |
| **API Style**         | REST                  |
| **Response Format**   | GeoJSON               |

> This stack balances fast MVP delivery with enterprise-grade design principles.

---

## 🏗️ System Architecture (MVP)

```
┌─────────────────────────────────┐
│  ML Engineer (CSV / JSON outputs)│
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│   One-time Data Loader Scripts  │
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│  PostgreSQL + PostGIS (Supabase)│
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│       NestJS API Layer          │
│       (JWT Auth Guards)         │
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│ Secure Interactive Map Dashboard│
└─────────────────────────────────┘
```

> Authentication is enforced at the API layer, keeping the ML and data layers decoupled.

---

## 🗃️ Database Schema (High-Level)

### 1️⃣ Migration Flows

- **Description:** Tracks inter-regional migration intensity
- **Geometry:** `LINESTRING`
- **Usage:** Flow visualizations

### 2️⃣ Growth Zones

- **Description:** Identifies rural → peri-urban → urban transitions
- **Geometry:** `POLYGON`
- **Usage:** Zoning overlays

### 3️⃣ Digital Risk

- **Description:** Highlights regions with high digital exclusion risk
- **Geometry:** `POLYGON`
- **Usage:** Includes explanatory risk factors

---

## 🔌 API Endpoints

> **Note:** All endpoints require authentication and return GeoJSON FeatureCollections.

| Endpoint        | Method | Description                                                                 |
| --------------- | ------ | --------------------------------------------------------------------------- |
| `/migration`    | `GET`  | Returns migration flow lines with intensity scores                          |
| `/growth-zones` | `GET`  | Returns classified regions (rural/peri-urban/urban) with growth scores      |
| `/digital-risk` | `GET`  | Returns regions with digital exclusion risk levels and contributing factors |

---

## 📁 Project Structure

```
src/
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.guard.ts
│   └── supabase.strategy.ts
├── migration/
├── growth/
├── digital-risk/
└── database/
    └── postgres.service.ts

scripts/
├── load_migration.ts
├── load_growth.ts
└── load_digital_risk.ts
```

---

## 🚀 Getting Started (Local Setup)

### 1️⃣ Prerequisites

- **Node.js** (v18+ recommended)
- **Supabase project** with:
  - PostgreSQL
  - PostGIS
  - Supabase Auth enabled

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Environment Configuration

Create a `.env` file:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_JWT_SECRET=<jwt_secret>
```

### 4️⃣ Load Data

```bash
ts-node scripts/load_migration.ts
ts-node scripts/load_growth.ts
ts-node scripts/load_digital_risk.ts
```

### 5️⃣ Start the Server

```bash
npm run start:dev
```

---

## 📐 Design Principles

- 🔒 **Security by default**
- 🎯 **Reliability over complexity**
- 📖 **Read-only, protected APIs**
- 🗺️ **GeoJSON-first responses**
- 🧩 **Clear separation** between ML, auth, and serving layers

---

## 🏁 MVP Deliverables

- [x] Secure backend server
- [x] Auth-protected APIs
- [x] Stable GeoJSON responses
- [x] Frontend-ready integration
- [x] Architecture suitable for scale-up

---
