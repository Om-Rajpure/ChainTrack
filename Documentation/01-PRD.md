# Product Requirements Document (PRD)
**Project:** ChainTrack – Blockchain Supply Chain Tracker *(working name, can be renamed)*
**Document:** 1 of 5 (PRD → TRD → System Flow → Schema & Contract Design → Implementation Plan)
**Version:** 1.0

---

## 1. Overview

ChainTrack is a web application that records the journey of a product from manufacturer to customer on a blockchain. Every handover (created, shipped, received, sold) is stored as a permanent, tamper-proof record. Anyone can scan a QR code on a product and instantly verify whether it is authentic and see its full history.

## 2. Problem Statement

- Supply chain records are kept separately by each party (manufacturer, transporter, shop), so they can be edited, lost, or disputed.
- Fake and tampered products enter the chain because there is no single trusted record.
- Customers have no easy way to verify where a product came from or whether it is genuine.

## 3. Goals

| ID | Goal |
|----|------|
| G1 | Give every product a unique digital identity and QR code. |
| G2 | Record every custody change and status update immutably on the blockchain. |
| G3 | Let customers verify authenticity and view the full journey without logging in. |
| G4 | Restrict actions by role so only the rightful party can update a product. |
| G5 | Deliver a complete, demo-ready system that runs end to end. |

## 4. Non-Goals (Out of Scope)

- Real payments, invoicing, or cryptocurrency transfers.
- Mainnet deployment (testnet or local chain only).
- IoT sensor integration (temperature, GPS hardware).
- Mobile native apps (responsive web only).
- Multi-company or multi-tenant separation.
- Legal or regulatory compliance features.

## 5. Users and Roles

| Role | Description | Login |
|------|-------------|-------|
| **Admin** | Registers and approves participants. Deployer of the smart contract. | Wallet |
| **Manufacturer** | Creates products and starts the chain. | Wallet |
| **Distributor** | Receives products, stores and ships them onward. | Wallet |
| **Retailer** | Receives products and sells them to customers. | Wallet |
| **Customer** | Scans a QR to verify a product. | None (public) |

## 6. Product Lifecycle

### 6.1 Statuses

`Created` → `InTransit` → `AtDistributor` → `InTransit` → `AtRetailer` → `Sold`

| Status | Meaning |
|--------|---------|
| Created | Registered by the manufacturer, still with the manufacturer. |
| InTransit | Handover initiated by the current owner, waiting for the receiver to accept. |
| AtDistributor | Accepted and held by a distributor. |
| AtRetailer | Accepted and held by a retailer. |
| Sold | Sold to the end customer. Final state. |

### 6.2 Handover Rule (Two-Step Transfer)

1. The current owner **initiates** a transfer to a named receiver (status becomes `InTransit`).
2. The receiver **accepts** (status becomes `AtDistributor` or `AtRetailer`) or **rejects** (product returns to the sender with its previous status).

### 6.3 Allowed Transitions

| From | Action | By | To |
|------|--------|----|----|
| (none) | Register product | Manufacturer | Created |
| Created | Initiate transfer to Distributor | Manufacturer (owner) | InTransit |
| InTransit (to Distributor) | Accept | Distributor (receiver) | AtDistributor |
| InTransit (to Distributor) | Reject | Distributor (receiver) | Created |
| AtDistributor | Initiate transfer to Retailer | Distributor (owner) | InTransit |
| InTransit (to Retailer) | Accept | Retailer (receiver) | AtRetailer |
| InTransit (to Retailer) | Reject | Retailer (receiver) | AtDistributor |
| AtRetailer | Mark as sold | Retailer (owner) | Sold |

Any other transition must be rejected by the system.

## 7. User Stories

### Admin
- **US-01** As an Admin, I can register a participant wallet with a role and organization name so that only approved parties can use the system.
- **US-02** As an Admin, I can deactivate a participant so they can no longer perform actions.
- **US-03** As an Admin, I can view all participants and all products.

### Manufacturer
- **US-04** As a Manufacturer, I can register a new product with its details so it gets a unique ID and QR code.
- **US-05** As a Manufacturer, I can register many units of the same product in a batch.
- **US-06** As a Manufacturer, I can transfer a product to a Distributor.
- **US-07** As a Manufacturer, I can view all products I created and their current status.

### Distributor
- **US-08** As a Distributor, I can see incoming transfers and accept or reject them.
- **US-09** As a Distributor, I can add a location update note while holding a product.
- **US-10** As a Distributor, I can transfer a product to a Retailer.

### Retailer
- **US-11** As a Retailer, I can see incoming transfers and accept or reject them.
- **US-12** As a Retailer, I can mark a product as sold.

### Customer
- **US-13** As a Customer, I can scan a QR code or enter a product ID to see its verification result.
- **US-14** As a Customer, I can see the full timeline of the product with who, when, and where for each step.

## 8. Functional Requirements

### 8.1 Authentication and Access
- **FR-01** Users log in by connecting a MetaMask wallet and signing a message (no passwords).
- **FR-02** The system determines the user's role from the on-chain participant registry.
- **FR-03** Unregistered wallets see a "Not registered, contact admin" message and cannot access role pages.
- **FR-04** Each role sees only its own pages and actions.

### 8.2 Participant Management (Admin)
- **FR-05** Admin can add a participant with: wallet address, role, organization name, contact email, location.
- **FR-06** Admin can activate or deactivate a participant.
- **FR-07** A wallet can hold only one role.

### 8.3 Product Registration
- **FR-08** Manufacturer can register a product with: name, category, description, batch number, manufacturing date, optional image, optional extra attributes.
- **FR-09** The system generates a unique Product ID (on-chain counter) and a QR code encoding the public verification URL.
- **FR-10** A data hash of the product details is stored on-chain; full details are stored off-chain.
- **FR-11** QR code can be downloaded or printed as PNG.
- **FR-12** Batch registration creates N separate products, each with its own ID and QR.

### 8.4 Custody Transfer
- **FR-13** Current owner can initiate a transfer only to an active participant of the correct next role.
- **FR-14** Receiver sees a pending list and can accept or reject.
- **FR-15** Each transfer records: from, to, timestamp, location text, optional note.
- **FR-16** A product with a pending transfer cannot be transferred again until resolved.

### 8.5 Updates and Sale
- **FR-17** The current owner can add a "location update" event without changing ownership.
- **FR-18** Retailer can mark a product as Sold; after that, no further changes are allowed.

### 8.6 Public Verification
- **FR-19** Public page `/verify/:productId` requires no login.
- **FR-20** Result is one of:
  - **Authentic:** product exists on-chain and off-chain data hash matches.
  - **Data Mismatch (Warning):** product exists but off-chain data does not match the on-chain hash.
  - **Not Found:** no such product ID on-chain.
- **FR-21** Page shows product details, current owner and status, and full event timeline.
- **FR-22** Page shows a link to the blockchain transaction for each event (block explorer or local tx hash).

### 8.7 Dashboard and Reports
- **FR-23** Each role has a dashboard with counts (e.g. products by status).
- **FR-24** Users can search and filter products by ID, name, status, and date.
- **FR-25** *(Stretch)* Export a product journey as a PDF certificate.

### 8.8 Alerts (Stretch)
- **FR-26** Flag a product as "Suspicious" if scanned after being marked Sold more than a set number of times.
- **FR-27** Admin can mark a product as "Recalled", visible on the verification page.

## 9. Business Rules

1. Only registered and active participants can perform actions.
2. Only the current owner can initiate a transfer or update location.
3. Only the designated receiver can accept or reject a pending transfer.
4. Ownership order is fixed: Manufacturer → Distributor → Retailer → Customer (Sold).
5. Blockchain records can never be edited or deleted; corrections are made by adding a new event.
6. `Sold` is final.

## 10. Data Principle (Hybrid Storage)

| Stored on-chain | Stored off-chain (database) |
|-----------------|-----------------------------|
| Product ID, owner, status | Product name, description, images |
| Participant registry (wallet, role, active) | Organization details, emails |
| Event log (type, actor, timestamp, location) | Search indexes, dashboard stats |
| Hash of product data | Full product details |

Details are defined in the TRD.

## 11. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Security:** all state-changing actions are checked by smart contract role rules, not just the UI. |
| NFR-02 | **Integrity:** on-chain history cannot be modified by anyone, including admin. |
| NFR-03 | **Performance:** page load under 3 seconds; verification result under 5 seconds on testnet. |
| NFR-04 | **Usability:** a new user can complete their main task in under 5 clicks; clear messages for wallet and transaction states (pending, success, failed). |
| NFR-05 | **Responsiveness:** works on desktop and mobile browsers; QR scan works from a phone camera. |
| NFR-06 | **Reliability:** if the database is unavailable, the verification page still shows on-chain data. |
| NFR-07 | **Demo readiness:** system runs fully on a local chain, with seed data and a documented setup. |

## 12. Assumptions and Constraints

- Users have MetaMask installed (or the demo uses a pre-funded test wallet).
- The system runs on a test network with free test currency.
- The project is built by one developer using an AI coding IDE, so scope is kept to the MVP first.
- Products are generic (any category); no industry-specific fields are required.

## 13. MVP vs Stretch

| MVP (must ship) | Stretch (only after MVP works) |
|-----------------|-------------------------------|
| Wallet login and role access | Batch registration (FR-12) |
| Admin participant management | PDF certificate (FR-25) |
| Product registration and QR | Suspicious scan alert (FR-26) |
| Two-step transfer with accept and reject | Recall flag (FR-27) |
| Location update and mark as sold | Map view of journey |
| Public verification with timeline | Analytics charts |
| Role dashboards, search and filter | |

## 14. Acceptance Criteria (MVP Done Means)

1. Admin registers one Manufacturer, one Distributor, and one Retailer.
2. Manufacturer registers a product and downloads its QR.
3. The product moves Manufacturer → Distributor → Retailer through initiate and accept steps, then is marked Sold.
4. A wrong-role or wrong-owner action is rejected with a clear error.
5. A reject action returns the product to the sender correctly.
6. Scanning the QR without login shows "Authentic" with a complete, correctly ordered timeline.
7. Changing a product's off-chain data directly in the database makes verification show "Data Mismatch".
8. An unknown ID shows "Not Found".
9. The entire flow runs on a local chain with one setup guide.

## 15. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wallet and network confusion | Demo failure | One network only; clear in-app prompts; local chain backup |
| Scope creep | Project not finished | MVP locked; stretch only after acceptance criteria pass |
| Testnet slowness or faucet limits | Delays | Develop and demo on local chain; testnet as final step |
| On-chain and off-chain data out of sync | Wrong display | Hash check plus on-chain as source of truth |

## 16. Open Decisions (Default Chosen)

| Decision | Default |
|----------|---------|
| Product category | Generic (category field) |
| Blockchain network | Local Hardhat for development, Sepolia for final demo |
| Login method | Wallet signature |
| Stretch features | Decided after MVP passes acceptance |

---
*Next document: 02 – Technical Requirements Document (TRD).*
