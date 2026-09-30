# System Flow Document
**Project:** ChainTrack – Blockchain Supply Chain Tracker
**Document:** 3 of 5 (PRD → TRD → **System Flow** → Schema & Contract Design → Implementation Plan)
**Version:** 1.0
**Depends on:** 01-PRD.md, 02-TRD.md

> Diagrams use Mermaid. They render in GitHub, VS Code (Markdown Preview Mermaid extension), and most AI IDEs. If a viewer shows raw text, paste the block into https://mermaid.live.

## Flow Index

| ID | Flow | Actor |
|----|------|-------|
| FLOW-01 | Wallet login | All roles |
| FLOW-02 | Participant onboarding | Admin |
| FLOW-03 | Product registration | Manufacturer |
| FLOW-04 | Transfer: initiate, accept, reject | Owner, Receiver |
| FLOW-05 | Location update and mark as sold | Owner, Retailer |
| FLOW-06 | Public verification (QR scan) | Customer |
| FLOW-07 | Indexer sync | System |
| FLOW-08 | Product state machine | Reference |
| FLOW-09 | Role and action matrix | Reference |
| FLOW-10 | Screen navigation by role | Reference |
| FLOW-11 | Error and edge cases | Reference |

---

## FLOW-01: Wallet Login (FR-01 to FR-04)

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant W as MetaMask
    participant A as API
    participant C as Contract

    U->>F: Click Connect Wallet
    F->>W: Request account access
    W-->>F: Wallet address
    F->>F: Check network matches app chain
    F->>A: GET /api/auth/nonce for address
    A-->>F: One-time nonce, valid 5 minutes
    F->>W: Ask to sign login message with nonce
    W-->>F: Signature
    F->>A: POST /api/auth/verify with address and signature
    A->>A: Recover signer and check nonce
    A->>C: getParticipant(address)
    C-->>A: role and active flag
    alt Registered and active
        A-->>F: Set httpOnly JWT cookie, return role
        F->>U: Redirect to role dashboard
    else Not registered or inactive
        A-->>F: 403 Not registered
        F->>U: Show message: contact admin
    end
```

**Rules**
- Nonce is single use; a reused or expired nonce returns 401.
- If the network is wrong, the UI shows a "Switch network" button before asking for a signature.
- Admin is recognized by matching the contract owner address.

---

## FLOW-02: Participant Onboarding (FR-05 to FR-07)

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant F as Frontend
    participant W as MetaMask
    participant C as Contract
    participant A as API
    participant D as Database

    Ad->>F: Fill form: wallet, role, org name, email, location
    F->>W: registerParticipant(wallet, role)
    W->>C: Signed transaction
    C->>C: Check caller is admin and wallet has no role
    alt Success
        C-->>F: Transaction confirmed
        F->>A: POST /api/participants with profile
        A->>C: getParticipant(wallet) to confirm role on-chain
        C-->>A: role matches
        A->>D: Save profile
        A-->>F: 201 Created
        F->>Ad: Show participant in list
    else Reverted
        C-->>F: Error AlreadyRegistered or NotAdmin
        F->>Ad: Show plain-language error
    end
```

**Deactivate:** Admin calls `setParticipantActive(wallet, false)` on-chain, then `PATCH /api/participants/:address` updates the profile flag. The contract value is what enforces access.

---

## FLOW-03: Product Registration (FR-08 to FR-12)

```mermaid
sequenceDiagram
    actor M as Manufacturer
    participant F as Frontend
    participant A as API
    participant D as Database
    participant W as MetaMask
    participant C as Contract

    M->>F: Fill product form and optional image
    F->>A: POST /api/uploads/image (if image)
    A-->>F: Image URL and image hash
    F->>A: POST /api/products/draft with details
    A->>A: Validate with Zod and compute dataHash
    A->>D: Save draft with dataHash
    A-->>F: draftId and dataHash
    F->>W: registerProduct(dataHash, location)
    W->>C: Signed transaction
    C->>C: Check caller is active Manufacturer
    C->>C: Create product with next ID, status Created
    C-->>F: Event ProductRegistered with productId
    F->>A: POST /api/products/confirm with draftId, productId, txHash
    A->>C: getProduct(productId)
    C-->>A: dataHash and creator
    A->>A: Check dataHash and creator match the draft
    A->>D: Mark product confirmed and store productId
    A-->>F: Product ready
    F->>M: Show product page and QR download
```

**Rules**
- If the wallet transaction is rejected or fails, the draft stays unconfirmed and expires after 24 hours.
- If `confirm` fails after a successful transaction, the indexer still picks up `ProductRegistered` and links it to the matching draft using `dataHash`. Nothing is lost.
- QR content: `{APP_BASE_URL}/verify/{productId}`.

---

## FLOW-04: Transfer of Custody (FR-13 to FR-16)

### 4A. Initiate

```mermaid
sequenceDiagram
    actor O as Current Owner
    participant F as Frontend
    participant W as MetaMask
    participant C as Contract

    O->>F: Open product, click Transfer
    F->>F: Show only valid receivers by next role
    O->>F: Choose receiver, location, note
    F->>W: initiateTransfer(id, receiver, location, note)
    W->>C: Signed transaction
    C->>C: Check owner, no pending transfer, receiver active and correct role
    alt Valid
        C->>C: Status becomes InTransit, set pendingReceiver
        C-->>F: Event TransferInitiated
        F->>O: Show status In Transit
    else Invalid
        C-->>F: Revert with custom error
        F->>O: Show plain-language error
    end
```

### 4B. Accept or Reject

```mermaid
sequenceDiagram
    actor R as Receiver
    participant F as Frontend
    participant W as MetaMask
    participant C as Contract

    R->>F: Open Transfers page
    F->>R: List of pending incoming products
    alt Accept
        R->>F: Click Accept and enter location
        F->>W: acceptTransfer(id, location)
        W->>C: Signed transaction
        C->>C: Check caller is pendingReceiver
        C->>C: Owner becomes receiver, clear pending
        C->>C: Status becomes AtDistributor or AtRetailer by role
        C-->>F: Event TransferAccepted
    else Reject
        R->>F: Click Reject and enter reason
        F->>W: rejectTransfer(id, reason)
        W->>C: Signed transaction
        C->>C: Check caller is pendingReceiver
        C->>C: Clear pending, owner unchanged
        C->>C: Status returns to Created or AtDistributor by receiver role
        C-->>F: Event TransferRejected
    end
    F->>R: Refresh product view
```

**Rules**
- The status after reject or accept is derived from the receiver's role, so no "previous status" field is needed.
- A product with a pending transfer cannot be transferred again or marked sold (FR-16).

---

## FLOW-05: Location Update and Mark as Sold (FR-17, FR-18)

```mermaid
sequenceDiagram
    actor O as Owner or Retailer
    participant F as Frontend
    participant W as MetaMask
    participant C as Contract

    alt Location update
        O->>F: Enter location and note
        F->>W: addLocationUpdate(id, location, note)
        W->>C: Signed transaction
        C->>C: Check owner, status not InTransit, not Sold
        C-->>F: Event LocationUpdated
    else Mark as sold (Retailer only)
        O->>F: Click Mark as Sold and enter location
        F->>W: markSold(id, location)
        W->>C: Signed transaction
        C->>C: Check caller is owning Retailer, status AtRetailer
        C->>C: Status becomes Sold
        C-->>F: Event ProductSold
    end
    F->>O: Refresh timeline
```

---

## FLOW-06: Public Verification (FR-19 to FR-22)

```mermaid
flowchart TD
    A["Customer scans QR or enters Product ID"] --> B["Open /verify/ID"]
    B --> C["API reads product from contract"]
    C --> D{"Product exists on-chain?"}
    D -- "No" --> E["Result: NOT FOUND (red)"]
    D -- "Yes" --> F["Read full history from contract"]
    F --> G{"Database reachable?"}
    G -- "No" --> H["Show on-chain data only, note: details unavailable"]
    H --> Z
    G -- "Yes" --> I["Load product details from database"]
    I --> J["Recompute hash from database details"]
    J --> K{"Hash equals on-chain hash?"}
    K -- "Yes" --> L["Result: AUTHENTIC (green)"]
    K -- "No" --> M["Result: DATA MISMATCH (amber warning)"]
    L --> Z["Show details, current owner, status, timeline with tx links"]
    M --> Z
    E --> Y["Show help text: check the code or report the product"]
```

**Notes**
- No login and no wallet needed.
- Each timeline entry shows: event type, actor organization and wallet, time, location, and a transaction link.
- Recalled or suspicious flags (stretch, FR-26 and FR-27) appear as an extra banner.

---

## FLOW-07: Indexer Sync

```mermaid
flowchart TD
    A["Timer tick (5s local, 15s testnet) or POST /api/sync"] --> B["Read lastProcessedBlock from database"]
    B --> C["Get latest block minus confirmations"]
    C --> D{"New blocks?"}
    D -- "No" --> Z["Wait for next tick"]
    D -- "Yes" --> E["Fetch contract logs in block range"]
    E --> F["For each event in order"]
    F --> G{"Already stored? (txHash + logIndex)"}
    G -- "Yes" --> H["Skip"]
    G -- "No" --> I["Insert into events table"]
    I --> J["Update products: status, owner, pendingReceiver"]
    J --> K{"Event is ProductRegistered?"}
    K -- "Yes" --> L["Link to draft by dataHash if not confirmed yet"]
    K -- "No" --> M["Continue"]
    L --> M
    H --> M
    M --> N{"More events?"}
    N -- "Yes" --> F
    N -- "No" --> O["Save lastProcessedBlock"]
    O --> Z
```

**Rules**
- Processing is idempotent, and a restart resumes from `lastProcessedBlock`.
- Range size is capped per run (for example 2000 blocks) to respect RPC limits.

---

## FLOW-08: Product State Machine

On-chain `Status` has 5 values. `InTransit` is shown as two sub-states below because the destination role decides where accept or reject leads.

```mermaid
stateDiagram-v2
    [*] --> Created: Manufacturer registers
    Created --> InTransitToDistributor: Manufacturer initiates transfer
    InTransitToDistributor --> AtDistributor: Distributor accepts
    InTransitToDistributor --> Created: Distributor rejects
    AtDistributor --> InTransitToRetailer: Distributor initiates transfer
    InTransitToRetailer --> AtRetailer: Retailer accepts
    InTransitToRetailer --> AtDistributor: Retailer rejects
    AtRetailer --> Sold: Retailer marks sold
    Sold --> [*]
```

Location updates do not change state; they append an event while the product is in `Created`, `AtDistributor`, or `AtRetailer`.

---

## FLOW-09: Role and Action Matrix

| Action | Admin | Manufacturer | Distributor | Retailer | Customer |
|--------|:-----:|:------------:|:-----------:|:--------:|:--------:|
| Register or deactivate participant | Yes | | | | |
| View all participants and products | Yes | | | | |
| Register product | | Yes | | | |
| Download QR | Yes | Yes (own) | | | |
| Initiate transfer | | Yes (owner) | Yes (owner) | | |
| Accept or reject transfer | | | Yes (receiver) | Yes (receiver) | |
| Add location update | | Yes (owner) | Yes (owner) | Yes (owner) | |
| Mark as sold | | | | Yes (owner) | |
| View own dashboard and products | Yes (all) | Yes | Yes | Yes | |
| Verify product and timeline | Yes | Yes | Yes | Yes | Yes (no login) |

Every "Yes" is enforced by the contract; the UI only hides what a role cannot do.

---

## FLOW-10: Screen Navigation by Role

```mermaid
flowchart LR
    Home["Landing page"] --> Verify["Verify page"]
    Home --> Login["Login (connect wallet)"]
    Login --> Dash["Dashboard"]

    Dash --> AdminP["Admin: Participants"]
    Dash --> ProdList["Products list"]
    Dash --> Trans["Transfers (Distributor, Retailer)"]
    ProdList --> New["New product (Manufacturer)"]
    ProdList --> Detail["Product detail"]
    New --> Detail
    Detail --> Act["Actions: transfer, update, sold"]
    Detail --> QR["Download QR"]
    Trans --> Detail
    Detail --> Verify
```

---

## FLOW-11: Error and Edge Cases

| Situation | System behavior | User sees |
|-----------|-----------------|-----------|
| MetaMask not installed | Detect missing wallet provider | "Install MetaMask" with link |
| Wrong network | Block actions | Banner with "Switch network" button |
| User rejects signature or transaction | No state change; draft (if any) expires | "Transaction cancelled" |
| Transaction reverts | Map custom error to message | Plain message, for example "You are not the owner of this product" |
| Transaction slow | Poll for receipt | "Waiting for confirmation…" with tx link |
| Unregistered wallet logs in | 403 from API | "Not registered, contact admin" |
| Participant deactivated mid-session | Contract rejects writes; API re-checks role | "Your account is deactivated" |
| Product ID does not exist | Contract returns not found | Verify page: Not Found |
| Database down | Verify reads chain only | On-chain result with "details unavailable" |
| RPC down | API returns 503 | "Blockchain unreachable, retry" button |
| Off-chain data edited directly | Hash mismatch | Verify page: Data Mismatch warning |
| Confirm call fails after successful transaction | Indexer links by `dataHash` | Product appears after next sync |
| Duplicate submit (double click) | Buttons disabled while pending; draft ID is single use | No duplicate product |
| Upload invalid (type or size) | Zod and server check | "Only JPG, PNG, WEBP up to 2 MB" |
| Transfer to wrong role | Contract revert `InvalidReceiver` | "Receiver must be a Distributor" (or Retailer) |

---

## Complete Demo Walkthrough (Maps to PRD Acceptance Criteria)

1. Admin logs in (FLOW-01) and registers Manufacturer, Distributor, Retailer (FLOW-02).
2. Manufacturer registers a product and downloads its QR (FLOW-03).
3. Manufacturer transfers to Distributor; Distributor accepts (FLOW-04).
4. Distributor adds a location update (FLOW-05).
5. Distributor transfers to Retailer; Retailer accepts (FLOW-04).
6. Retailer marks the product as sold (FLOW-05).
7. Customer scans the QR and sees Authentic with the full timeline (FLOW-06).
8. Demo the failure cases: wrong role action, reject flow, edited database (Data Mismatch), and unknown ID (Not Found).

---
*Next document: 04 – Backend Schema and Contract Design (database tables, contract code structure, ABI-level details).*
