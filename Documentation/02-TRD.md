# Technical Requirements Document (TRD)
**Project:** ChainTrack – Blockchain Supply Chain Tracker
**Document:** 2 of 5 (PRD → **TRD** → System Flow → Schema & Contract Design → Implementation Plan)
**Version:** 1.0
**Depends on:** 01-PRD.md (FR, NFR and US IDs referenced below)

---

## 1. Technical Summary

ChainTrack is a three-layer system:

1. **Smart contract (Solidity)** – source of truth for participants, product ownership, status, and event history.
2. **Web app (Next.js)** – UI for all roles, plus server-side API routes acting as the backend.
3. **Database (PostgreSQL)** – off-chain product details, search and dashboard data, filled by an event indexer.

Users sign and send blockchain transactions **directly from their own wallet (MetaMask)**. The backend never holds user keys.

## 2. Technology Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Smart contract language | Solidity ^0.8.24 | Standard, AI tools know it well |
| Contract framework | Hardhat (with TypeScript) | Local chain, tests, deploy scripts |
| Contract libraries | OpenZeppelin (only if needed, e.g. `Ownable`) | Audited building blocks |
| Local chain | Hardhat node (chain ID 31337) | Free, instant, reliable for demo |
| Test network | Sepolia (chain ID 11155111) | Free test ETH, widely supported |
| Frontend and backend | Next.js (App Router) + TypeScript | One codebase; API routes serve as backend |
| Styling | Tailwind CSS (+ shadcn/ui optional) | Fast, clean UI |
| Blockchain client | ethers.js v6 | Wallet connection, contract calls, log reading |
| Wallet | MetaMask | Most common |
| Database | PostgreSQL | Relational, good for filters and joins |
| ORM | Prisma | Typed schema and migrations |
| Validation | Zod | Input validation on API and forms |
| QR generation | `qrcode` npm package | Simple PNG or SVG output |
| QR scanning | `html5-qrcode` (or `@yudiel/react-qr-scanner`) | Camera scan in browser |
| Auth session | JWT in httpOnly cookie (`jose` library) | Stateless, secure |
| Testing | Hardhat + Chai (contracts), Vitest (utilities and API), Playwright (optional E2E) | Coverage at each layer |
| Local infra | Docker Compose (PostgreSQL) | One command setup |
| Hosting (optional) | Vercel (web) + Supabase or Neon (PostgreSQL) | Free tiers |

> Use the latest stable versions at build time and lock them in `package.json`. Package versions are not fixed in this document.

## 3. High-Level Architecture

```
+--------------------+       sign & send tx        +---------------------------+
|   Browser (User)   | --------------------------> |  Blockchain (Hardhat/     |
|  Next.js UI +      | <-------------------------- |  Sepolia) – SupplyChain   |
|  MetaMask          |     read state / events     |  smart contract           |
+---------+----------+                             +-------------+-------------+
          |  HTTPS (JSON)                                        ^
          v                                                      | read logs
+---------+----------+        read/write          +--------------+-------------+
|  Next.js API       | <------------------------> |  Indexer (runs inside      |
|  routes (backend)  |                            |  backend, polls chain)     |
+---------+----------+                            +----------------------------+
          |
          v
+--------------------+
|   PostgreSQL       |
+--------------------+
```

### Responsibilities

| Component | Responsibility |
|-----------|----------------|
| Smart contract | Roles, ownership, statuses, transition rules, history, data hashes |
| Frontend | Wallet connection, forms, sending transactions, displaying data |
| API routes | Auth, product details storage, image upload, queries for dashboards, QR data |
| Indexer | Reads contract events and mirrors them into PostgreSQL for search and lists |
| PostgreSQL | Product details, participant profiles, indexed events, pending drafts |

### Source of truth rule
- **Blockchain wins** for: existence, owner, status, event history, data hash.
- **Database wins** for: descriptive text, images, contact details.
- The public verification page **reads directly from the blockchain** (via RPC) for status and history, so it works even if the database is down (NFR-06). The database is only needed for the descriptive details.

## 4. Smart Contract Requirements (Summary)

Single contract: **`SupplyChain.sol`**. Full interface and structs are defined in Document 4.

### 4.1 Enums
- `Role`: None, Manufacturer, Distributor, Retailer *(Admin is the contract owner, not a role entry)*
- `Status`: Created, InTransit, AtDistributor, AtRetailer, Sold
- `EventType`: Registered, TransferInitiated, TransferAccepted, TransferRejected, LocationUpdate, Sold

### 4.2 Core functions

| Function | Caller | Purpose | PRD ref |
|----------|--------|---------|---------|
| `registerParticipant(address, Role)` | Admin | Add a participant | FR-05 |
| `setParticipantActive(address, bool)` | Admin | Activate or deactivate | FR-06 |
| `registerProduct(bytes32 dataHash, string location)` | Manufacturer | Create product, returns ID | FR-08–10 |
| `initiateTransfer(uint id, address to, string location, string note)` | Current owner | Start handover | FR-13, FR-15 |
| `acceptTransfer(uint id, string location)` | Pending receiver | Accept handover | FR-14 |
| `rejectTransfer(uint id, string reason)` | Pending receiver | Reject handover | FR-14 |
| `addLocationUpdate(uint id, string location, string note)` | Current owner | Log location | FR-17 |
| `markSold(uint id, string location)` | Retailer (owner) | Final state | FR-18 |
| `getProduct(uint id)` | Anyone (view) | Product core data | FR-20, FR-21 |
| `getHistory(uint id)` | Anyone (view) | All events | FR-21 |
| `getParticipant(address)` | Anyone (view) | Role lookup | FR-02 |

### 4.3 Contract rules
- Every state-changing function uses modifiers: `onlyAdmin`, `onlyActiveRole(Role)`, `onlyOwnerOf(id)`, `onlyPendingReceiver(id)`.
- Transitions follow the table in PRD section 6.3 exactly; anything else reverts with a custom error.
- Product IDs start at 1 and increase by 1. ID 0 means "not found".
- Events are emitted for every state change (used by the indexer).
- No Ether is ever received or sent. Functions are non-payable.
- History is append-only; no delete or edit function exists.
- Use custom errors (for example `NotOwner()`, `InvalidStatus()`, `NotParticipant()`) instead of long revert strings.

### 4.4 On-chain events emitted
`ParticipantRegistered`, `ParticipantStatusChanged`, `ProductRegistered`, `TransferInitiated`, `TransferAccepted`, `TransferRejected`, `LocationUpdated`, `ProductSold`

## 5. Data Hashing Specification (FR-10, FR-20)

Used to detect tampering of off-chain data.

1. Take the product's core fields: `serialNumber` (unique per unit, generated by the backend at draft time), `name`, `category`, `description`, `batchNumber`, `manufacturingDate`, `manufacturerWallet`, `attributes` (key-value object), `imageHash` (optional). The serial number makes every hash unique, so identical units in a batch still get different hashes.
2. Build a **canonical JSON string**: keys sorted alphabetically, no extra whitespace, dates in ISO `YYYY-MM-DD`, empty optional fields omitted.
3. Compute `keccak256(utf8Bytes(canonicalJson))` using ethers.js.
4. Store the resulting `bytes32` on-chain at registration.
5. On verification, recompute the hash from database data and compare with the on-chain value. Equal means **Authentic**. Different means **Data Mismatch**.

A shared utility `computeProductHash()` is used by both frontend and backend so results are always identical.

## 6. Authentication and Authorization (FR-01 to FR-04)

### 6.1 Login flow (wallet signature)
1. Client calls `GET /api/auth/nonce?address=0x…` and receives a random one-time nonce.
2. Client asks MetaMask to sign a fixed-format message including the nonce, domain, and timestamp (EIP-4361 "Sign-In with Ethereum" style).
3. Client sends `POST /api/auth/verify` with address and signature.
4. Server recovers the signer address, checks nonce validity (single use, expires in 5 minutes), then reads the role from the contract.
5. Server issues a JWT (contains address and role, expires in 12 hours) in an **httpOnly, secure, sameSite=lax cookie**.

### 6.2 Authorization
- **Blockchain level:** contract modifiers are the real enforcement (NFR-01).
- **API level:** middleware reads the JWT and checks the role before handling the request.
- **UI level:** menus and pages are hidden by role (convenience only, never trusted).
- If a participant is deactivated on-chain, the API re-checks the role on the contract for state-changing calls, so old tokens cannot bypass it.

## 7. Backend API Specification

Base path: `/api`. All responses are JSON. Errors use `{ "error": { "code": string, "message": string } }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/auth/nonce` | Public | Get sign-in nonce |
| POST | `/auth/verify` | Public | Verify signature, set cookie |
| POST | `/auth/logout` | Any | Clear cookie |
| GET | `/me` | Any role | Current user profile and role |
| GET | `/participants` | Admin | List participants |
| POST | `/participants` | Admin | Save participant profile (after on-chain registration) |
| PATCH | `/participants/:address` | Admin | Update profile or active flag |
| POST | `/products/draft` | Manufacturer | Save details, return `dataHash` and `draftId` |
| POST | `/products/confirm` | Manufacturer | Bind draft to `productId` and `txHash`; verifies against chain |
| GET | `/products` | Role-based | List and filter (owner's products or all for Admin) |
| GET | `/products/:id` | Public | Details plus DB-side info |
| GET | `/products/:id/qr` | Manufacturer, Admin | QR image (PNG) |
| GET | `/verify/:id` | Public | Combined chain + DB verification result |
| GET | `/transfers/pending` | Distributor, Retailer | Incoming transfers |
| GET | `/dashboard/stats` | Any role | Counts by status |
| POST | `/uploads/image` | Manufacturer | Upload product image (max 2 MB, jpg/png/webp) |
| POST | `/sync` | Internal (cron or manual) | Trigger indexer run |

### 7.1 Product registration sequence (important)
1. Manufacturer fills form → `POST /products/draft` → backend stores draft, computes `dataHash`, returns it.
2. Frontend calls `registerProduct(dataHash, location)` on the contract → wallet signs → tx mined.
3. Frontend reads `ProductRegistered` event to get `productId`.
4. Frontend calls `POST /products/confirm` with `draftId`, `productId`, `txHash`.
5. Backend **checks on-chain** that the product's `dataHash` and creator match the draft, then marks the product as confirmed.
6. Drafts not confirmed within 24 hours are deleted.

This guarantees the database never claims a product that the blockchain does not have.

### 7.2 Public verification logic (`GET /verify/:id`)
1. Read `getProduct(id)` and `getHistory(id)` from the chain. If not found → return `NOT_FOUND`.
2. Fetch details from the database. If the database is unavailable → return chain data with `detailsAvailable: false`.
3. Recompute hash from database details and compare with on-chain hash → `AUTHENTIC` or `DATA_MISMATCH`.
4. Return status, owner, timeline, and tx hashes.

## 8. Indexer Requirements

- Runs inside the backend as a polling loop (every 5 seconds locally, every 15 seconds on testnet) and can also be triggered via `POST /sync`.
- Stores `lastProcessedBlock` in the database.
- Reads contract logs from `lastProcessedBlock + 1` to `latest - confirmations` (confirmations: 0 on local chain, 2 on Sepolia).
- For each event, upserts into `events` and updates `products.currentStatus`, `products.currentOwner`, `products.pendingReceiver`.
- **Idempotent:** processing the same event twice must not create duplicates (unique key: `txHash + logIndex`).
- Handles restart safely by resuming from `lastProcessedBlock`.

## 9. Frontend Requirements

### 9.1 Pages

| Route | Access | Content |
|-------|--------|---------|
| `/` | Public | Landing, verify box, scan button |
| `/verify/[id]` | Public | Verification result and timeline |
| `/login` | Public | Connect wallet, sign in |
| `/dashboard` | Any role | Stats and quick actions |
| `/admin/participants` | Admin | Add, list, deactivate participants |
| `/products` | Role-based | Product list with search and filters |
| `/products/new` | Manufacturer | Registration form |
| `/products/[id]` | Role-based | Detail, actions, QR download |
| `/transfers` | Distributor, Retailer | Incoming transfers, accept or reject |

### 9.2 UI behavior rules
- Show **wallet state**, **network state** (wrong network banner with "Switch network" button), and **transaction state** (waiting for signature, pending, confirmed, failed with reason).
- Disable action buttons while a transaction is pending.
- Map contract custom errors to plain-language messages.
- Verification page shows a colored banner: green Authentic, amber Data Mismatch, red Not Found.
- Responsive layout; QR scanner opens the phone camera and works over HTTPS or localhost.

## 10. QR Code Specification

- QR content: `{APP_BASE_URL}/verify/{productId}` (plain URL, so any phone camera opens it).
- Format: PNG, 512×512, error correction level M.
- Label under the QR shows product name and ID for print.

## 11. Configuration (Environment Variables)

| Variable | Used by | Example / note |
|----------|---------|----------------|
| `NEXT_PUBLIC_CHAIN_ID` | Frontend | `31337` or `11155111` |
| `NEXT_PUBLIC_RPC_URL` | Frontend | Public read RPC |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Frontend | Written by deploy script |
| `NEXT_PUBLIC_APP_BASE_URL` | Frontend, QR | `http://localhost:3000` |
| `RPC_URL` | Backend, indexer | Server-side RPC endpoint |
| `CONTRACT_ADDRESS` | Backend | Same as above |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Long random string |
| `SEPOLIA_RPC_URL` | Hardhat | From Alchemy or Infura |
| `DEPLOYER_PRIVATE_KEY` | Hardhat only | Test wallet only, never committed |
| `UPLOAD_DIR` or storage keys | Backend | Local folder or Supabase storage |

`.env` files are git-ignored; a `.env.example` is committed.

## 12. Security Requirements

| Area | Requirement |
|------|-------------|
| Keys | No private keys in frontend or backend for user actions; deployer key only in local `.env` |
| Contract | Access modifiers on every write function; custom errors; no payable functions; no external calls; Solidity 0.8 overflow protection |
| API | Zod validation on all inputs; JWT check on protected routes; rate limiting on `/auth/*` and `/verify/*` (for example 60 requests per minute per IP) |
| Auth | Nonce single use and expiring; signature checked server-side; httpOnly cookies |
| Uploads | Type and size check; random filenames; no execution from upload folder |
| Web | CORS restricted to app origin; security headers; output escaped to prevent XSS |
| Data | Database access only via Prisma (parameterized); no secrets in logs |

## 13. Performance and Reliability

| Item | Target |
|------|--------|
| Page load (dashboard, lists) | Under 3 seconds |
| Verification result | Under 5 seconds on Sepolia, under 1 second on local chain |
| Indexer lag | Under 30 seconds on Sepolia |
| Database down | Verify page still shows chain data |
| RPC down | Friendly error and retry button |
| Pagination | Lists load 20 items per page |

## 14. Testing Requirements

### 14.1 Smart contract tests (Hardhat + Chai)
Must cover:
- Admin-only participant management.
- Every valid transition in the PRD table.
- Every invalid transition reverts with the correct error.
- Wrong-role and wrong-owner calls revert.
- Only the pending receiver can accept or reject.
- Reject returns the product to the correct previous status.
- `Sold` blocks all further changes.
- Event emission and history order.
- Target: **100% of write functions** covered, and at least 90% line coverage.

### 14.2 Backend and utility tests (Vitest)
- `computeProductHash` gives identical results for the same data in different key orders.
- Auth nonce expiry and reuse rejection.
- Verify logic for Authentic, Data Mismatch, and Not Found.
- Indexer idempotency (same events processed twice give the same database state).

### 14.3 End-to-end test (Playwright, optional but recommended)
Runs the PRD acceptance criteria flow on the local chain.

## 15. Development and Deployment

### 15.1 Environments

| Environment | Chain | Database | Purpose |
|-------------|-------|----------|---------|
| Local | Hardhat node | Docker PostgreSQL | Development and demo |
| Testnet | Sepolia | Supabase or Neon | Final demo and submission |

### 15.2 Repository structure

```
chaintrack/
├── contracts/            # Hardhat project
│   ├── contracts/        # SupplyChain.sol
│   ├── test/             # Contract tests
│   ├── scripts/          # deploy.ts, seed.ts
│   └── hardhat.config.ts
├── web/                  # Next.js app
│   ├── src/app/          # pages and API routes
│   ├── src/lib/          # chain, hash, auth, db helpers
│   ├── src/lib/contract/ # ABI and address (generated by deploy)
│   ├── src/components/
│   └── prisma/           # schema.prisma, migrations
├── docker-compose.yml    # PostgreSQL
├── docs/                 # PRD, TRD and other documents
└── README.md             # setup and demo guide
```

### 15.3 Scripts
- `npm run chain` – start local Hardhat node.
- `npm run deploy:local` – deploy contract, write address and ABI to `web/src/lib/contract/`.
- `npm run seed` – register demo Admin, Manufacturer, Distributor, Retailer and sample products.
- `npm run dev` – start web app.
- `npm run test` – run all tests.

### 15.4 Demo readiness (NFR-07)
- One README with a step-by-step setup taking under 15 minutes.
- Seed script creates a complete demo dataset, including one product in every status.
- Pre-configured test accounts documented for MetaMask import.

## 16. Traceability (PRD to Technical)

| PRD area | Implemented by |
|----------|----------------|
| FR-01–04 Auth and access | Section 6, contract modifiers, API middleware |
| FR-05–07 Participants | Contract functions, `/participants` API, admin page |
| FR-08–12 Product registration and QR | Sections 5, 7.1, 10 |
| FR-13–16 Transfers | Contract transfer functions, `/transfers` page |
| FR-17–18 Location update and sold | `addLocationUpdate`, `markSold` |
| FR-19–22 Public verification | Section 7.2, `/verify/[id]` |
| FR-23–24 Dashboard and search | Indexer, `/dashboard/stats`, `/products` |
| NFR-01–07 | Sections 12, 13, 14, 15 |

## 17. Technical Decisions Log

| Decision | Chosen | Rejected and why |
|----------|--------|------------------|
| Who sends transactions | User's wallet | Backend relayer (adds trust and key risk) |
| Where product text is stored | PostgreSQL | Fully on-chain (costly), IPFS (extra complexity for this scope) |
| Backend framework | Next.js API routes | Separate Express server (two codebases to manage) |
| History storage | On-chain array, plus events for the indexer | Events only (verify page would depend on the indexer) |
| Product data | Generic with attributes | Industry-specific fields (limits flexibility) |

---
*Next document: 03 – System Flow (diagrams of every process).*
