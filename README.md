# ChainTrack — Blockchain Supply Chain Tracker

ChainTrack is an end-to-end decentralized, tamper-evident supply chain tracking application designed to verify product authenticity, provenance, and custody lifecycle transitions from Manufacturer to Distributor, Retailer, and final Sale.

---

## 1. High-Level Architecture

ChainTrack implements a three-layer architecture:

1. **Smart Contract (Trust Layer / Source of Truth):**
   - Implemented in **Solidity (^0.8.24)** managed via **Hardhat** (TypeScript).
   - Immutable state authority for participants, product registration, multi-party custody transfers, location updates, and ownership verification.
   - Local Hardhat Network Chain ID: `31337`; Sepolia Testnet Chain ID: `11155111`.

2. **Web Application & Backend API (Application Layer):**
   - Built with **Next.js (App Router)** and **TypeScript**, styled using **Tailwind CSS**.
   - Serves both the responsive UI and backend API routes under `/api`.
   - Direct wallet interaction via **MetaMask** and **ethers.js (v6)** without server custody of private keys.
   - EIP-4361 Sign-In with Ethereum (SIWE) and secure 12-hour `httpOnly` JWT session cookies (`jose`).

3. **Off-Chain Database & Event Indexer (Query & Indexing Layer):**
   - **PostgreSQL** relational database managed with **Prisma ORM**.
   - Idempotent blockchain event indexer that mirrors on-chain events (`ProductEvent`), tracks block cursor, and maintains fast product snapshots.
   - Run locally via **Docker Compose**.

---

## 2. Prerequisites

Ensure the following tools are installed on your workstation before starting:

- **Node.js**: `v20.x` or higher (LTS recommended, tested on `v24.x`)
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: Required for running the local PostgreSQL container
- **MetaMask browser extension**: Required for web3 interactions and transaction signing
- **Git**: For version control

> **Note on Project Documentation:**
> Authoritative specification documents (PRD, TRD, System Flow, Schema & Contract Design) reside in the `Documentation/` directory.

---

## 3. Repository Structure

```
chaintrack/
│
├── contracts/                  # Hardhat blockchain workspace
│   ├── contracts/              # SupplyChain.sol
│   ├── test/                   # Comprehensive contract test suite (SC-01 to SC-36)
│   ├── scripts/                # deploy.ts, seed.ts
│   ├── hardhat.config.ts       # Hardhat configuration (Solidity 0.8.24, Chain ID 31337)
│   ├── package.json            # Contract package dependencies
│   └── tsconfig.json           # TypeScript configuration for Hardhat
│
├── web/                        # Next.js web application workspace
│   ├── src/
│   │   ├── app/                # App Router pages and /api route handlers
│   │   │   ├── page.tsx        # Public landing & product ID search / QR scanner
│   │   │   ├── login/          # MetaMask SIWE sign-in & demo account reference
│   │   │   ├── dashboard/      # Role-specific dashboard & metrics
│   │   │   ├── products/       # Product catalog, new registration form, details
│   │   │   ├── transfers/      # Pending transfers review (accept / reject)
│   │   │   ├── admin/          # Participant access control & status management
│   │   │   └── verify/[id]/    # Public verification portal (on-chain truth check)
│   │   ├── lib/                # db, hash, validation, chain, auth-nonce, indexer, errors
│   │   │   └── contract/       # Deployed contract ABI (SupplyChain.abi.json) and deployment.json
│   │   └── components/         # Navbar, NetworkBanner, StatusBadge, Timeline, QrScannerModal, QrCodeCard
│   ├── prisma/
│   │   ├── schema.prisma       # Full Prisma schema (Participant, Product, ProductEvent, AuthNonce, IndexerState)
│   │   └── migrations/         # PostgreSQL migration DDL scripts
│   ├── test/                   # Comprehensive unit, API, indexer, and hardening test suites
│   ├── package.json            # Web application dependencies
│   ├── next.config.mjs         # Next.js configuration
│   ├── tailwind.config.ts      # Tailwind CSS configuration
│   └── tsconfig.json           # TypeScript configuration for Next.js
│
├── docs/                       # Project documentation references
├── docker-compose.yml          # Local PostgreSQL service definition
├── package.json                # Root workspaces package configuration
├── .gitignore                  # Git ignore rules for builds, secrets, and temp files
├── .env.example                # Documented template for environment variables
└── README.md                   # Setup guide and developer instructions
```

---

## 4. Quickstart Setup Guide (Under 15 Minutes)

### Step 1: Clone and Configure Environment

1. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
2. Verify or adjust environment settings in `.env` if using custom ports or credentials.

### Step 2: Install Workspace Dependencies

Install dependencies for all workspaces (`contracts` and `web`) from the repository root:

```bash
npm install
```

### Step 3: Start the PostgreSQL Database

Launch the PostgreSQL container using Docker Compose:

```bash
docker compose up -d
```

Run Prisma migrations and generate the Prisma Client:
```bash
npm --prefix web run prisma:generate
```

### Step 4: Start the Local Hardhat Blockchain & Deploy

In a terminal, start the local Hardhat node (Chain ID `31337`):
```bash
npm run chain
```

In a second terminal, deploy the `SupplyChain` contract:
```bash
npm run deploy:local
```

Seed demo participant accounts and sample lifecycle products:
```bash
npm run seed
```

### Step 5: Start the Next.js Development Server

Launch the Next.js application:
```bash
npm run dev
```

Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 5. Pre-Configured Demo Accounts (Local Hardhat Node)

| Account | Role | Address | Description |
|---------|------|---------|-------------|
| `#0` | **Deployer / Admin** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Contract Owner, Participant Registry Manager |
| `#1` | **Manufacturer** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | PharmaCorp Inc. (Product Registration & Initial Transfer) |
| `#2` | **Distributor** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | FastLogistics Global (Transit Reception & Handover) |
| `#3` | **Retailer** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | MediStore Pharmacy (Retail Acceptance & Mark Sold) |

---

## 6. API Endpoint Specifications

Base Path: `/api`  
Response Format: JSON (`{ "error": { "code": "...", "message": "..." } }` on failure)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/auth/nonce?address=0x...` | Issue 5-minute single-use login nonce | Public |
| `POST` | `/api/auth/verify` | Verify wallet signature & issue 12h JWT session | Public |
| `POST` | `/api/auth/logout` | Invalidate and clear session cookie | Public |
| `GET` | `/api/me` | Fetch current session and profile | Any Role |
| `GET` | `/api/participants` | List participant profiles from database | Admin / Public |
| `POST` | `/api/participants` | Save profile after verifying on-chain registration | Admin |
| `PATCH` | `/api/participants/:address` | Update organization profile details | Admin |
| `POST` | `/api/products/draft` | Create draft, generate UUID & canonical `dataHash` | Manufacturer |
| `POST` | `/api/products/confirm` | Bind draft to on-chain `productId` with chain check | Manufacturer |
| `GET` | `/api/products` | Search/filter confirmed products | Any Role |
| `GET` | `/api/products/:id` | Fetch product details by draft ID or chain product ID | Any Role |
| `GET` | `/api/products/:id/qr` | Dynamic 512x512 PNG QR code generation | Any Role |
| `GET` | `/api/verify/:id` | Public verification (`AUTHENTIC`, `DATA_MISMATCH`, `NOT_FOUND`) | Public |
| `POST` | `/api/uploads/image` | Validate, hash (keccak256), and store image (<=2MB) | Manufacturer |
| `GET` | `/api/dashboard/stats` | Aggregated metrics for products and statuses | Any Role |
| `GET` | `/api/transfers/pending` | Query incoming transfers for recipient wallet | Distributor / Retailer |
| `POST` | `/api/sync` | Trigger batch event indexer sync | Admin / Internal |

---

## 7. Canonical Product Hashing Algorithm

The integrity anchor between off-chain PostgreSQL metadata and the on-chain smart contract is computed via `computeProductHash()`:

1. **Required Fields:** `serialNumber` (UUID), `name` (trimmed), `category` (trimmed), `batchNumber` (trimmed), `manufacturingDate` (`YYYY-MM-DD`), `manufacturerWallet` (lowercase).
2. **Optional Fields:** `description`, `attributes` (key-value dictionary), `imageHash`. Empty or null optional fields are omitted.
3. **Sorting:** All keys are recursively sorted in strict alphabetical order.
4. **Serialization:** Encoded as a single-line UTF-8 JSON string with zero whitespace.
5. **Hash:** `keccak256(utf8Bytes(canonicalJson))`, formatted as `0x` + 64 hexadecimal characters (`bytes32`).

---

## 8. Root npm Scripts & Testing Commands

| Script | Command | Description |
|--------|---------|-------------|
| `npm run chain` | `npm --prefix contracts run chain` | Starts local Hardhat node (Chain ID: 31337) |
| `npm run deploy:local` | `npm --prefix contracts run deploy:local` | Deploys `SupplyChain.sol` and writes ABI/address |
| `npm run seed` | `npm --prefix contracts run seed` | Seeds demo accounts and sample lifecycle products |
| `npm run dev` | `npm --prefix web run dev` | Starts Next.js development server on port 3000 |
| `npm run test` | `npm --prefix contracts test && npm --prefix web test` | Runs entire test suite (85 tests passing) |
| `npm --prefix contracts run coverage` | `npx hardhat coverage` | Runs contract test coverage (100% lines, 92.39% branches) |
| `npm --prefix web run build` | `next build` | Compiles production build (15 static & dynamic routes) |
| `npm --prefix web run lint` | `next lint` | Runs ESLint analysis (0 errors, 0 warnings) |

---

## 9. Implementation Status

- [x] **Phase 1 — Development Environment**: Hardhat, PostgreSQL container, Next.js App Router, Tailwind, Prisma baseline.
- [x] **Phase 2 — Smart Contract Core**: `SupplyChain.sol`, two-step state machine, custom errors, event emission, local deploy script.
- [x] **Phase 3 — Smart Contract Testing**: 43 tests covering SC-01 through SC-36, 100% write function coverage, 100% line coverage.
- [x] **Phase 4 — PostgreSQL + Backend API Foundation**: Full Prisma schema & migrations, canonical hashing, Zod validation, product draft/confirm pipeline, verification engine, image upload hashing, 29 backend tests.
- [x] **Phase 5 — Event Indexer**: Block cursor tracking, chunked log scanning, idempotent `ProductEvent` deduplication, snapshot refresh.
- [x] **Phase 6 — Frontend & Wallet Authentication**: SIWE wallet login, JWT session cookies, responsive UI, QR generation & scanning, role-based dashboards.
- [x] **Phase 7 — Integration, Hardening & Production Readiness**: Full regression testing (85 tests passing), ESLint clean check (0 errors, 0 warnings), Next.js production build verified.
