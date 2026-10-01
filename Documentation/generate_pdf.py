import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Don't draw header/footer on cover page if page == 1
        if self._pageNumber > 1:
            # Header
            self.drawString(54, letter[1] - 36, "ChainTrack — Faculty Demo & Viva Presentation Guide")
            self.drawRightString(letter[0] - 54, letter[1] - 36, "Ethereum Supply Chain Traceability")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)
            
            # Footer
            self.line(54, 45, letter[0] - 54, 45)
            self.drawString(54, 32, "Verified Project Status: 87/87 Automated Tests Passing | 100% Contract Statements")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(letter[0] - 54, 32, page_text)
        self.restoreState()

def create_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Color Palette
    PRIMARY = colors.HexColor("#0f172a")     # Dark Slate
    ACCENT = colors.HexColor("#2563eb")      # Royal Blue
    SECONDARY = colors.HexColor("#475569")   # Slate Grey
    LIGHT_BG = colors.HexColor("#f8fafc")    # Off-white / light slate
    BORDER_COLOR = colors.HexColor("#e2e8f0")
    SUCCESS_BG = colors.HexColor("#ecfdf5")
    SUCCESS_TEXT = colors.HexColor("#065f46")
    WARNING_BG = colors.HexColor("#fffbeb")
    WARNING_TEXT = colors.HexColor("#92400e")
    CARD_BG = colors.HexColor("#f1f5f9")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=TA_LEFT,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        alignment=TA_LEFT,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=ACCENT,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1e293b"),
        alignment=TA_LEFT,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'Body_Bold_Custom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    quote_style = ParagraphStyle(
        'Quote_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=3,
        spaceAfter=3
    )

    def make_callout(text, bg_color=CARD_BG, border_color=BORDER_COLOR, title=None, text_color=None):
        content = []
        if title:
            content.append(Paragraph(f"<b>{title}</b>", ParagraphStyle('CTitle', parent=body_style, fontName='Helvetica-Bold', textColor=text_color or PRIMARY, spaceAfter=3)))
        content.append(Paragraph(text, ParagraphStyle('CText', parent=body_style, textColor=text_color or colors.HexColor("#1e293b"))))
        t = Table([[content]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_color),
            ('BOX', (0,0), (-1,-1), 1, border_color),
            ('PADDING', (0,0), (-1,-1), 7),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        return t

    story = []

    # -------------------------------------------------------------
    # COVER / HEADER BANNER
    # -------------------------------------------------------------
    story.append(Paragraph("CHAINTRACK", title_style))
    story.append(Paragraph("Comprehensive Faculty Demonstration, Viva Defense & Presentation Coach", subtitle_style))
    
    meta_data = [
        [
            Paragraph("<b>Repository:</b> github.com/Om-Rajpure/ChainTrack<br/><b>Verified Tests:</b> 87/87 Passing (43 Contract + 44 Web/API)", body_style),
            Paragraph("<b>Contract Coverage:</b> 100% Statements, Funcs, Lines (92.4% Branch)<br/><b>Deployment:</b> Ethereum Sepolia (11155111) & Local Hardhat", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------
    # SECTION 1: ONE SENTENCE & TIME-BASED PITCHES
    # -------------------------------------------------------------
    story.append(Paragraph("1. Core Project Explanations by Duration", h1_style))
    
    story.append(make_callout(
        "<b>ChainTrack in One Sentence:</b> A hybrid Web3 supply chain tracking system that anchors critical product custody and lifecycle events immutably on an Ethereum smart contract while maintaining searchable metadata off-chain in PostgreSQL, enabling zero-login public verification and mathematical tamper detection via cryptographic hashing.",
        bg_color=colors.HexColor("#eff6ff"),
        border_color=colors.HexColor("#bfdbfe")
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("30-Second Explanation (High Level)", h2_style))
    story.append(Paragraph(
        "\"In traditional supply chains, product records are siloed in private corporate databases where they can be manipulated, forged, or disputed, allowing counterfeit goods to enter unnoticed. "
        "<b>ChainTrack solves this by separating proof from metadata.</b> Every handover—from Manufacturer to Distributor to Retailer—is authorized by role-based smart contracts and permanently anchored on Ethereum. "
        "Rich details live in PostgreSQL, and canonical metadata is hashed on-chain using Keccak-256. "
        "Any consumer can scan a QR code without logging in or holding crypto. The system re-hashes live database metadata and compares it against the blockchain proof to deliver an instant verdict: <b>Authentic</b>, <b>Data Mismatch</b>, or <b>Not Found</b>.\"",
        quote_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("2-Minute Explanation (Technical Overview)", h2_style))
    story.append(Paragraph(
        "\"Good morning, Professor. Today I am presenting <b>ChainTrack</b>, an end-to-end blockchain supply chain traceability and anti-counterfeiting platform.<br/><br/>"
        "<b>The Problem & Trust Deficit:</b> In multi-tier supply chains, products move through independent stakeholders: Manufacturers, Distributors, Retailers, and Consumers. Centralized databases fail here because whoever owns the database server holds unilateral power to alter timestamps, forge transit checkpoints, or delete records retroactively.<br/><br/>"
        "<b>Hybrid Storage Architecture:</b> Storing images and descriptive metadata directly on Ethereum is cost-prohibitive. ChainTrack implements a dual-layer architecture: (1) An immutable <b>Solidity smart contract</b> (<code>SupplyChain.sol</code>) enforcing state transitions, actor roles, append-only history, and Keccak-256 data hashes; (2) An off-chain <b>Next.js + Prisma + PostgreSQL</b> layer for searchable metadata, dashboard analytics, and sessions; (3) An autonomous <b>background indexer</b> scanning logs to ensure eventual consistency.<br/><br/>"
        "<b>Two-Step Custody Handover:</b> A transfer is initiated by the current owner (<code>InTransit</code>), and only the designated active receiver can <code>acceptTransfer</code> or <code>rejectTransfer</code> (rolling custody back). Finally, the Retailer marks the product <code>Sold</code>.<br/><br/>"
        "<b>Public Zero-Login Verification:</b> Consumers scan the QR code to open <code>/verify/[id]</code>. The system dynamically recomputes the Keccak-256 hash from live database fields and verifies it against the blockchain proof, alerting users to any database tampering.\"",
        quote_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("5-Minute Explanation (Engineering & Security Deep-Dive)", h2_style))
    story.append(Paragraph(
        "\"Respected Guide, I would like to detail the engineering architecture, smart contract state machine, and tamper-detection mechanics of ChainTrack.<br/><br/>"
        "<b>1. Motivation & Real-World Scope:</b> Counterfeit products cause over $450B in annual losses globally. Vulnerabilities occur at transit handovers. When systems rely on single SQL databases, insider threats or compromised servers alter custody histories undetected.<br/><br/>"
        "<b>2. Strict State Machine:</b> <code>SupplyChain.sol</code> manages 5 product states: <code>Created &rarr; InTransit &rarr; AtDistributor &rarr; InTransit &rarr; AtRetailer &rarr; Sold</code>. Handover uses an escrow protocol where transfers can be accepted or rejected with recorded on-chain reasons. <code>Sold</code> represents permanent terminal finality.<br/><br/>"
        "<b>3. Canonical Metadata Hashing:</b> We construct a deterministic JSON representation containing serial numbers, names, batch IDs, dates, and manufacturer wallets. Keys are sorted alphabetically, whitespace stripped, and hashed: <code>DataHash = keccak256(CanonicalJSON)</code>. This 32-byte digest is anchored on-chain at registration.<br/><br/>"
        "<b>4. Background Event Indexer:</b> Direct RPC event scanning is slow and rate-limited. Our polling daemon tracks an atomic block cursor (<code>IndexerState</code>), queries logs in chunks, deduplicates via composite keys <code>(txHash, logIndex)</code>, and takes on-chain state snapshots to mirror status into PostgreSQL.<br/><br/>"
        "<b>5. Passwordless Security:</b> Sign-In with Ethereum (EIP-4361) verifies single-use signed nonces, issuing stateless JWTs in <code>httpOnly</code> cookies. Smart contract modifiers (<code>onlyOwnerOf</code>, <code>onlyActiveParticipant</code>) enforce cryptographic authorization independently of the UI.\"",
        quote_style
    ))

    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 2: SYSTEM ARCHITECTURE & DUAL-PIPELINE FLOW
    # -------------------------------------------------------------
    story.append(Paragraph("2. System Architecture & Component Interactions", h1_style))
    
    arch_box = """
<b>High-Level Dual-Pipeline Architecture:</b><br/>
<font face="Courier" size="7">
+-----------------------------------------------------------------------------------------+
|                                    BROWSER / CLIENT                                     |
|              Next.js 14 App Router (Tailwind CSS, React 18, Lucide Icons)               |
+---------------------------+---------------------------------+---------------------------+
                            |                                 |
     Sign & Send Tx         |                                 | HTTPS REST / Cookie Auth
 (EIP-1193 / ethers.js v6)  |                                 | (Zod Validated, SIWE Session)
                            v                                 v
+---------------------------+-----------+     +---------------+---------------------------+
|    ETHEREUM / SEPOLIA TESTNET         |     |             NEXT.JS BACKEND               |
|         SupplyChain.sol               |     |               API ROUTES                  |
| - Participant Registry (Roles)        |     | - /api/auth (SIWE Nonce + JWT)            |
| - Product State Machine               |     | - /api/products (Draft & On-Chain Confirm)|
| - Append-Only Event Histories         |     | - /api/verify (Dynamic Hash Verification) |
| - Keccak-256 Metadata Hash Anchors    |     | - /api/transfers (Pending Inbound Goods)  |
+---------------------------+-----------+     +---------------+---------------------------+
                            |                                 |
                            | Event Logs Emitted              | Prisma ORM 5.x
                            | (TransferInitiated, etc.)       | (Parameterized SQL Queries)
                            v                                 v
+---------------------------+-----------+     +---------------+---------------------------+
|        BACKGROUND INDEXER             |     |                POSTGRESQL                 |
|  (Polling Daemon / Chunked Sync)      |---->| - Participant Profiles & Roles            |
| - Idempotent log deduplication        |     | - Product Metadata, Drafts & Attributes   |
| - Reorg-safe confirmation lag         |     | - ProductEvent Mirror Table               |
| - State snapshot reconciliation       |     | - IndexerState Block Cursor               |
+---------------------------------------+     +-------------------------------------------+
</font>
"""
    story.append(make_callout(arch_box, bg_color=LIGHT_BG, border_color=BORDER_COLOR))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Why the Indexer Exists (Faculty Defense Point)", h2_style))
    story.append(Paragraph(
        "<b>1. Relational Query Efficiency:</b> Ethereum is an execution trie, not a query engine. Filtering products by category, owner, or status via RPC requires scanning millions of historical logs, taking several seconds and hitting provider rate limits. The indexer enables sub-15ms SQL queries.<br/>"
        "<b>2. Resilient Event Mirroring:</b> The daemon tracks <code>lastProcessedBlock</code> in PostgreSQL and deduplicates events using a unique database constraint on <code>(txHash, logIndex)</code>. Even across network crashes, no event is lost or duplicated.<br/>"
        "<b>3. Decoupled Verification:</b> Zero-login public verification reads directly from Ethereum RPC for ownership and history, maintaining availability even if the PostgreSQL database is temporarily offline.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # -------------------------------------------------------------
    # SECTION 3: TECHNOLOGY STACK
    # -------------------------------------------------------------
    story.append(Paragraph("3. Technology Stack & Selection Rationale", h1_style))
    
    tech_table_data = [
        [Paragraph("<b>Technology</b>", body_bold), Paragraph("<b>Exact Purpose in ChainTrack</b>", body_bold), Paragraph("<b>Why Selected over Alternatives</b>", body_bold)],
        [Paragraph("<b>Solidity (^0.8.24)</b>", body_style), Paragraph("Core smart contract logic (<code>SupplyChain.sol</code>)", body_style), Paragraph("EVM standard; built-in overflow protection and custom errors (<code>error NotOwner()</code>) saving gas.", body_style)],
        [Paragraph("<b>Hardhat</b>", body_style), Paragraph("Local blockchain environment, testing, and deployment", body_style), Paragraph("Native TypeScript integration, instant local mining, gas profiling, and EVM compatibility.", body_style)],
        [Paragraph("<b>Ethereum Sepolia</b>", body_style), Paragraph("Public Proof-of-Stake test network", body_style), Paragraph("Official Ethereum testnet; mirrors mainnet consensus rules without real financial costs.", body_style)],
        [Paragraph("<b>Next.js 14 (App Router)</b>", body_style), Paragraph("Full-stack web application and backend API handlers", body_style), Paragraph("Unified TypeScript repo combining React Server Components with secure serverless API routes.", body_style)],
        [Paragraph("<b>PostgreSQL + Prisma</b>", body_style), Paragraph("Relational storage for off-chain metadata, search, and events", body_style), Paragraph("ACID compliance, parameterized queries, automated migrations, and multi-column filtering.", body_style)],
        [Paragraph("<b>ethers.js (v6)</b>", body_style), Paragraph("Client and server Web3 blockchain interactions", body_style), Paragraph("Modern, lightweight TypeScript library for transaction signing and Keccak-256 hashing.", body_style)],
        [Paragraph("<b>SIWE + `jose` (JWT)</b>", body_style), Paragraph("Cryptographic wallet authentication and sessions", body_style), Paragraph("EIP-4361 passwordless standard; signs nonces; JWTs sealed in <code>httpOnly</code> cookies.", body_style)],
        [Paragraph("<b>Zod</b>", body_style), Paragraph("Runtime API request and schema validation", body_style), Paragraph("Strict input sanitization before payloads reach database or hashing pipelines.", body_style)],
        [Paragraph("<b>qrcode & html5-qrcode</b>", body_style), Paragraph("QR code generation and in-browser camera scanning", body_style), Paragraph("Generates PNG QR tags; parses video streams client-side without native mobile app downloads.", body_style)],
    ]
    tech_table = Table(tech_table_data, colWidths=[100, 190, 214])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), CARD_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(tech_table)

    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 4: DEMO FLOW & PRESENTATION SCRIPT
    # -------------------------------------------------------------
    story.append(Paragraph("4. Step-by-Step Live Demonstration Script", h1_style))
    story.append(Paragraph("Follow this exact clicking sequence and speaking script during the live project evaluation:", body_style))
    story.append(Spacer(1, 4))

    demo_steps = [
        [
            Paragraph("<b>Phase & Screen</b>", body_bold),
            Paragraph("<b>Exact UI Actions</b>", body_bold),
            Paragraph("<b>What to Say (Verbatim Presenter Script)</b>", body_bold)
        ],
        [
            Paragraph("<b>1. Public Landing</b><br/><code>/</code>", body_style),
            Paragraph("Open homepage in browser. Point to the verification search bar and Connect Wallet button.", body_style),
            Paragraph("\"This is ChainTrack's public portal. The platform separates public consumer verification from authenticated enterprise supply chain operations.\"", quote_style)
        ],
        [
            Paragraph("<b>2. Manufacturer Login</b><br/><code>/login</code>", body_style),
            Paragraph("Select <b>Account #2 (Manufacturer)</b> in MetaMask. Click Connect & Sign SIWE nonce.", body_style),
            Paragraph("\"I am connecting as Acme Manufacturing. Notice there are no passwords—our server issues a cryptographic nonce that MetaMask signs to issue a secure session cookie.\"", quote_style)
        ],
        [
            Paragraph("<b>3. Product Registration</b><br/><code>/products/new</code>", body_style),
            Paragraph("Fill product form (Smart Health Tracker, BATCH-2026-X1). Submit & confirm MetaMask tx.", body_style),
            Paragraph("\"When submitted, the backend creates a canonical JSON representation and hashes it with Keccak-256. MetaMask prompts <code>registerProduct</code> on-chain, anchoring this 32-byte digest immutably.\"", quote_style)
        ],
        [
            Paragraph("<b>4. Custody Handover</b><br/><code>/products/1</code>", body_style),
            Paragraph("Click <b>Initiate Transfer</b>. Choose SwiftLogistics (Distributor). Confirm tx. Status becomes <code>IN_TRANSIT</code>.", body_style),
            Paragraph("\"We enforce a two-step escrow handover. The product is now locked in transit. Custody cannot be transferred to an unauthorized party or wrong role.\"", quote_style)
        ],
        [
            Paragraph("<b>5. Distributor Acceptance</b><br/><code>/transfers</code>", body_style),
            Paragraph("Switch MetaMask to <b>Account #3 (Distributor)</b>. Open Transfers, click <b>Accept Transfer</b>.", body_style),
            Paragraph("\"As the Distributor, I inspect incoming packages. If goods were damaged, I could click 'Reject' with an on-chain reason. Everything is intact, so I accept, becoming the new owner.\"", quote_style)
        ],
        [
            Paragraph("<b>6. Transit Checkpoint</b><br/><code>/products/1</code>", body_style),
            Paragraph("Click <b>Add Location Update</b>. Enter 'Cold Vault 2', note 'Temp verified 4°C'. Confirm tx.", body_style),
            Paragraph("\"The owner can log transit checkpoints without altering ownership, creating an immutable audit trail of environmental and routing updates.\"", quote_style)
        ],
        [
            Paragraph("<b>7. Retailer Sale</b><br/><code>/products/1</code>", body_style),
            Paragraph("Transfer to Retailer &rarr; Switch to <b>Account #4 (Retailer)</b> &rarr; Accept &rarr; Click <b>Mark as Sold</b>.", body_style),
            Paragraph("\"The Retailer receives the unit and marks it 'Sold'. Once sold, the smart contract state machine locks permanently. No further transfers or edits can ever occur.\"", quote_style)
        ],
        [
            Paragraph("<b>8. Public Verification</b><br/><code>/verify/1</code>", body_style),
            Paragraph("Open Incognito Tab &rarr; Navigate to <code>/verify/1</code> (or scan QR code).", body_style),
            Paragraph("\"Notice I am completely logged out. Any consumer scanning the QR code receives an instant <b>AUTHENTIC</b> verdict, displaying the verified owner and complete blockchain event timeline.\"", quote_style)
        ],
    ]
    demo_table = Table(demo_steps, colWidths=[90, 180, 234])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), CARD_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(demo_table)

    story.append(Spacer(1, 8))

    # -------------------------------------------------------------
    # SECTION 5: TAMPER DETECTION ("THE WOW MOMENT")
    # -------------------------------------------------------------
    story.append(Paragraph("5. The Tamper Detection Demonstration (\"The Wow Moment\")", h1_style))
    
    tamper_box = """
<b>Live Tamper-Detection Protocol (45 Seconds):</b><br/>
1. <b>Initial State:</b> Open <code>/verify/1</code> &rarr; Show the faculty the green <b>AUTHENTIC</b> banner.<br/>
2. <b>Simulate Database Compromise:</b> Open Prisma Studio (or SQL terminal) &rarr; Modify Product #1's <code>batchNumber</code> from <code>BATCH-2026-X1</code> to <code>BATCH-FAKE-99</code>.<br/>
3. <b>Trigger Re-Verification:</b> Refresh <code>/verify/1</code> in the browser.<br/>
4. <b>Result:</b> The verdict immediately switches to <font color="#92400e"><b>DATA MISMATCH (Amber Warning)</b></font>.<br/>
5. <b>Explanation:</b> <i>\"The blockchain record never changed. The application dynamically regenerated the Keccak-256 hash from the modified database record, and detected that it no longer matched the hash permanently anchored on Ethereum during manufacturing.\"</i><br/>
6. <b>Restore:</b> Revert <code>batchNumber</code> back to <code>BATCH-2026-X1</code> &rarr; Refresh &rarr; Green <b>AUTHENTIC</b> is restored.
"""
    story.append(make_callout(tamper_box, bg_color=WARNING_BG, border_color=colors.HexColor("#fde68a"), text_color=WARNING_TEXT))

    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 6: COMPREHENSIVE VIVA Q&A (32 QUESTIONS)
    # -------------------------------------------------------------
    story.append(Paragraph("6. Comprehensive Viva Voce & Technical Defense (32 Questions)", h1_style))
    story.append(Paragraph("Detailed answers across all 6 technical evaluation domains:", body_style))
    story.append(Spacer(1, 4))

    viva_categories = [
        ("Domain 1: Problem Statement & Core Architecture", [
            ("Q1: Why is blockchain required? Why not just use PostgreSQL with digital signatures?",
             "A centralized database has a single administrator who can alter data, delete logs, or manipulate keys. Blockchain provides decentralized consensus and immutable state enforcement across competing supply chain participants without relying on a trusted central authority."),
            
            ("Q2: What exact data is stored on-chain vs. off-chain?",
             "On-chain: product IDs, current owner and pending receiver addresses, status enum, append-only history entries (timestamp, location, note), participant roles, and the 32-byte Keccak-256 metadata hash. Off-chain (PostgreSQL): product names, descriptions, images, organization details, and searchable indexes."),
            
            ("Q3: Why is Ethereum Sepolia used instead of Ethereum Mainnet?",
             "Sepolia is an official Ethereum Proof-of-Stake testnet mirroring mainnet EVM execution and consensus without incurring real financial gas costs, providing an authentic production-grade demonstration environment."),
            
            ("Q4: Why not store entire images and product descriptions directly on-chain?",
             "Storing 1 MB of arbitrary data on Ethereum costs thousands of dollars in gas. ChainTrack uses a hybrid model: the smart contract holds only what is necessary for security, anchoring off-chain data integrity via cryptographic hashing."),
            
            ("Q5: What is the physical oracle problem, and how does ChainTrack handle it?",
             "The oracle problem refers to bridging physical reality with digital records. In ChainTrack, unique serial UUIDs are bound to QR tags, and two-step custody transfers ensure that physical recipients verify goods before accepting on-chain liability."),
        ]),

        ("Domain 2: Event Indexer & Database Architecture", [
            ("Q6: Explain why the background Indexer is necessary.",
             "Directly querying Ethereum event logs for complex frontend filters or search requires scanning thousands of blocks via RPC, which is slow and rate-limited. The indexer mirrors events into PostgreSQL for sub-millisecond querying while keeping the blockchain as the source of truth."),
            
            ("Q7: How does the indexer handle crash recovery and prevent duplicate events?",
             "The indexer tracks its progress in `IndexerState.lastProcessedBlock` and uses a database composite unique constraint on `(txHash, logIndex)`. On restart, it resumes from `lastProcessedBlock + 1`, and duplicate logs are skipped idempotently."),
            
            ("Q8: What happens if PostgreSQL goes completely offline?",
             "Zero-login public verification (`/verify/[id]`) continues to function because it reads core ownership, status, and event history directly from the Ethereum smart contract via RPC, displaying on-chain data with a 'Details unavailable' banner."),
            
            ("Q9: How does the indexer guard against blockchain reorgs?",
             "On Sepolia, the indexer applies a 2-block confirmation lag (reading up to `latest - 2`), ensuring that temporary chain reorganizations do not cause inconsistent state transitions to be indexed."),
            
            ("Q10: Why are `ProductEvent` and `Product` tables logically linked without database foreign keys?",
             "To ensure the indexer can ingest and persist on-chain events immediately, even if the corresponding product draft record has not yet been confirmed or synced in PostgreSQL."),
        ]),

        ("Domain 3: Smart Contract & State Machine", [
            ("Q11: Explain the two-step transfer protocol in `SupplyChain.sol`.",
             "To prevent sending inventory to wrong or unwilling parties, `initiateTransfer` sets status to `InTransit` and assigns a `pendingReceiver`. Only the designated receiver can invoke `acceptTransfer` (claiming ownership) or `rejectTransfer` (rolling status back to the sender)."),
            
            ("Q12: What happens if a receiver rejects a transfer?",
             "Custody remains with the original sender, `pendingReceiver` is cleared, status rolls back (`Created` if from Distributor, `AtDistributor` if from Retailer), and a `TransferRejected` event is emitted with the recorded rejection reason."),
            
            ("Q13: Why are custom Solidity errors used instead of `require(condition, 'string')`?",
             "Custom errors (`error NotOwner()`) are significantly cheaper in gas because they compile to a 4-byte selector hash rather than storing expensive ASCII string literals in contract bytecode."),
            
            ("Q14: What prevents two products from registering with the same metadata hash?",
             "The smart contract maintains a storage mapping `mapping(bytes32 => bool) private hashUsed`. If `hashUsed[dataHash]` is already true, `registerProduct` immediately reverts with `DuplicateHash()`."),
            
            ("Q15: Can the Admin change product ownership or mark a product Sold?",
             "No. The Admin role is strictly restricted to participant registration and deactivation. Ownership mutations can only be executed by the current cryptographic owner or designated receiver."),
            
            ("Q16: Can a product be transferred directly from Manufacturer to Retailer?",
             "No. The contract verifies that from status `Created`, transfers can only be addressed to an active account with `Role.Distributor`. Skipping intermediary roles reverts with `InvalidReceiver()`."),
        ]),

        ("Domain 4: Cryptographic Hashing & Verification", [
            ("Q17: Why is canonical JSON serialization required before hashing?",
             "JSON key ordering is non-deterministic across operating systems and runtimes. Sorting keys alphabetically and normalizing dates and addresses guarantees that identical metadata always produces the exact same UTF-8 byte stream and Keccak-256 hash."),
            
            ("Q18: Which fields are included in the canonical hash calculation?",
             "`serialNumber` (UUID per unit), `name`, `category`, `batchNumber`, `manufacturingDate`, `manufacturerWallet`, and sorted optional `attributes` and `imageHash`. The serial number guarantees unique hashes even for identical units in the same batch."),
            
            ("Q19: How does the public verification endpoint detect off-chain metadata tampering?",
             "It fetches the on-chain hash from `getProduct(id)`, fetches the database record, executes `computeProductHash()` over live database fields, and compares the two hashes. If unequal, it flags `DATA_MISMATCH`."),
            
            ("Q20: Why is `keccak256` chosen over standard `SHA-256`?",
             "`keccak256` is the native cryptographic hash function of the Ethereum Virtual Machine (EVM), providing optimal gas efficiency and seamless compatibility across smart contracts and ethers.js."),
        ]),

        ("Domain 5: Security, Authentication & Web3 Identity", [
            ("Q21: Explain how Sign-In with Ethereum (SIWE) works in ChainTrack.",
             "The server generates an expiring single-use cryptographic `nonce`. MetaMask signs this message. The server recovers the signer address, verifies their on-chain role via `getParticipant()`, and issues a stateless JWT stored in an `httpOnly, Secure, SameSite=Lax` cookie."),
            
            ("Q22: If an attacker intercepts the JWT session cookie, can they alter blockchain state?",
             "No. The JWT only authorizes API read/write operations (e.g. creating drafts). All state-changing blockchain transactions require an explicit private key signature directly inside MetaMask; the backend never possesses user private keys."),
            
            ("Q23: Why is role authorization enforced on the smart contract rather than just UI?",
             "Frontend route masking and button hiding are purely for user experience. Anyone can craft a raw transaction and submit it to the contract address via RPC. Solidity modifiers (`onlyAdmin`, `onlyActiveParticipant`, `onlyOwnerOf`) enforce protocol-level security."),
            
            ("Q24: What happens if a participant is deactivated on-chain while currently logged in?",
             "The smart contract immediately rejects any transaction from that wallet via `modifier onlyActiveParticipant`. API route middleware also checks on-chain active status for sensitive operations."),
            
            ("Q25: How are replay attacks prevented during wallet login?",
             "Each login challenge includes a unique random nonce with a 5-minute expiration timestamp, recorded in the `AuthNonce` table and marked `usedAt` upon first verification."),
        ]),

        ("Domain 6: Economics, Testing, Limits & Scalability", [
            ("Q26: What is the gas cost profile of ChainTrack transactions?",
             "Product registration costs ~120,000–160,000 gas; transfer initiation, acceptance, and marking as sold cost ~45,000–75,000 gas. On EVM Layer-2 rollups (Arbitrum, Polygon, Base), transactions cost less than $0.01 each."),
            
            ("Q27: What automated testing coverage was achieved?",
             "87 total automated tests: 43 smart contract tests (100% statements, 100% functions, 100% lines, 92.4% branches) and 44 web/API integration tests passing cleanly with zero linter errors."),
            
            ("Q28: What are the primary technical limitations of this MVP?",
             "(1) Physical-to-digital gap: Standard QR codes can be copied (production requires NFC crypto-tags); (2) Escrow timeout: If a receiver never responds, products stay `InTransit` (future extension: `cancelTransfer`); (3) Layer-1 throughput: High-volume scale requires Layer-2 rollups."),
            
            ("Q29: Can the smart contract be upgraded if business rules change?",
             "In this MVP, bytecode is permanently immutable for trust. In an enterprise environment, an ERC-1967 Transparent or UUPS Proxy pattern would be used to upgrade logic contracts while preserving state."),
            
            ("Q30: How does the QR code scanner work without external hardware?",
             "It uses the `html5-qrcode` library to capture video frames directly from mobile and desktop webcams, parsing QR code matrix data entirely client-side without third-party server uploads."),
            
            ("Q31: What prevents text overflow attacks on-chain (e.g., massive location strings)?",
             "The contract enforces strict length limits: `MAX_LOCATION_LENGTH` is 100 bytes and `MAX_NOTE_LENGTH` is 280 bytes. Exceeding lengths reverts with `StringTooLong()`."),
            
            ("Q32: Could this system support automated IoT sensor inputs?",
             "Yes. IoT gateways equipped with secure hardware wallets can be registered with authorized roles to call `addLocationUpdate` or trigger automated escrow logic when sensor thresholds (e.g., temperature) are breached."),
        ])
    ]

    for cat_title, questions in viva_categories:
        story.append(Paragraph(f"<b>{cat_title}</b>", h2_style))
        for q, a in questions:
            story.append(Paragraph(f"<b>{q}</b>", ParagraphStyle('VQ', parent=body_style, fontName='Helvetica-Bold', textColor=PRIMARY, spaceBefore=4, spaceAfter=2)))
            story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 7: CHECKLIST & CHEAT SHEET
    # -------------------------------------------------------------
    story.append(Paragraph("7. Day-Before Preparation Checklist & Demo Cheat Sheet", h1_style))
    
    checklist_text = """
<b>Pre-Demo Verification Checklist:</b><br/>
[ ] <b>MetaMask Wallets:</b> 4 Accounts labeled (Admin, Manufacturer, Distributor, Retailer) with Sepolia test ETH.<br/>
[ ] <b>Local Environment Backup:</b> Hardhat node tested (<code>npm run chain</code>) and seeded (<code>npm run seed</code>).<br/>
[ ] <b>Test Suite Execution:</b> Run <code>npm run test</code> &rarr; Verify all 87 automated unit and integration tests pass.<br/>
[ ] <b>Database Status:</b> PostgreSQL active and <code>IndexerState</code> initialized.<br/>
[ ] <b>Browser Tabs Ready:</b> App (Tab 1), Public Verify (Tab 2), Etherscan (Tab 3), GitHub (Tab 4), Prisma Studio (Tab 5).
"""
    story.append(make_callout(checklist_text, bg_color=SUCCESS_BG, border_color=colors.HexColor("#a7f3d0"), text_color=SUCCESS_TEXT))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Final 7-Minute Presentation Sequence Runbook", h2_style))
    
    runbook_data = [
        [Paragraph("<b>Time Window</b>", body_bold), Paragraph("<b>Presentation Topic</b>", body_bold), Paragraph("<b>Key Talking Point & Screen Focus</b>", body_bold)],
        [Paragraph("<b>0:00 - 0:45</b>", body_style), Paragraph("Problem Statement", body_style), Paragraph("Siloed corporate databases enable undetected counterfeits and unprovable custody disputes.", body_style)],
        [Paragraph("<b>0:45 - 1:30</b>", body_style), Paragraph("Solution & Architecture", body_style), Paragraph("Hybrid model: Ethereum anchors state, roles, and Keccak-256 hash; PostgreSQL stores rich metadata.", body_style)],
        [Paragraph("<b>1:30 - 2:00</b>", body_style), Paragraph("Tech Stack", body_style), Paragraph("Solidity 0.8.24, Hardhat, Next.js 14, PostgreSQL, Prisma ORM, SIWE + JWT, ethers.js v6.", body_style)],
        [Paragraph("<b>2:00 - 4:30</b>", body_style), Paragraph("Live Lifecycle Demo", body_style), Paragraph("Manufacturer registers &rarr; InTransit &rarr; Distributor accepts &rarr; Checkpoint &rarr; Retailer marks SOLD.", body_style)],
        [Paragraph("<b>4:30 - 5:30</b>", body_style), Paragraph("Public Verification", body_style), Paragraph("Zero-login scan opens <code>/verify/1</code> &rarr; Instant <b>AUTHENTIC</b> verdict and complete on-chain timeline.", body_style)],
        [Paragraph("<b>5:30 - 6:15</b>", body_style), Paragraph("Tamper Detection Demo", body_style), Paragraph("Modify database batch number in Prisma Studio &rarr; Refresh &rarr; Instant <b>DATA MISMATCH</b> warning.", body_style)],
        [Paragraph("<b>6:15 - 7:00</b>", body_style), Paragraph("Summary & Viva Transition", body_style), Paragraph("87/87 automated tests passing, 100% smart contract statement coverage. Open for viva questions.", body_style)],
    ]
    runbook_table = Table(runbook_data, colWidths=[80, 130, 294])
    runbook_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), CARD_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(runbook_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    output_pdf = r"D:\Projects\BlockChain\Documentation\ChainTrack_Faculty_Demo_Preparation_Guide.pdf"
    create_pdf(output_pdf)
