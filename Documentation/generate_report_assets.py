import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = r"D:\Projects\BlockChain\Documentation\report_assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

# Copy DMCE College Logo
dmce_logo_src = r"D:\Projects\BlockChain\Documentation\extracted_media\image3.png"
dmce_logo_dst = os.path.join(ASSETS_DIR, "dmce_logo.png")
if os.path.exists(dmce_logo_src):
    img = Image.open(dmce_logo_src)
    img.save(dmce_logo_dst)
    print("DMCE Logo saved.")

# Colors
NAVY = "#173B57"
ORANGE = "#F97316"
SLATE = "#0F172A"
MUTED_SLATE = "#475569"
LIGHT_BG = "#F8FAFC"
BORDER = "#CBD5E1"
WHITE = "#FFFFFF"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED = "#EF4444"
CARD_BG = "#F1F5F9"

def save_fig(fig, filename):
    out_path = os.path.join(ASSETS_DIR, filename)
    plt.savefig(out_path, bbox_inches='tight', dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    print(f"Generated: {filename}")

# ==============================================================================
# FIGURE 1: SYSTEM ARCHITECTURE OF CHAINTRACK
# ==============================================================================
def gen_fig1():
    fig, ax = plt.subplots(figsize=(11, 6.5), dpi=300)
    fig.patch.set_facecolor(LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    # Title
    ax.text(0.5, 0.95, "ChainTrack: Dual-Pipeline Hybrid Architecture", fontsize=14, weight='bold', color=SLATE, ha='center')

    # Client Layer
    client_box = patches.FancyBboxPatch((0.08, 0.72), 0.84, 0.16, boxstyle="round,pad=0.03", facecolor=WHITE, edgecolor=NAVY, linewidth=2)
    ax.add_patch(client_box)
    ax.text(0.5, 0.83, "CLIENT / BROWSER TIER", fontsize=11, weight='bold', color=NAVY, ha='center')
    ax.text(0.5, 0.76, "Next.js 14 App Router  |  React 18  |  Tailwind CSS  |  MetaMask Extension (EIP-1193)", fontsize=9, color=MUTED_SLATE, ha='center')

    # Split Paths: Blockchain vs Backend
    # Left: Web3 / Blockchain Path
    bc_box = patches.FancyBboxPatch((0.08, 0.35), 0.38, 0.28, boxstyle="round,pad=0.03", facecolor=WHITE, edgecolor=ORANGE, linewidth=1.8)
    ax.add_patch(bc_box)
    ax.text(0.27, 0.58, "ON-CHAIN TRUST LAYER", fontsize=10, weight='bold', color=ORANGE, ha='center')
    ax.text(0.27, 0.52, "Ethereum Sepolia / Hardhat Node", fontsize=8.5, weight='bold', color=SLATE, ha='center')
    ax.text(0.27, 0.46, "- SupplyChain.sol Smart Contract\n- Immutable Role Registry & State Machine\n- Append-Only Event Histories\n- Keccak-256 Metadata Hash Anchors", fontsize=7.5, color=MUTED_SLATE, ha='center')

    # Right: Web2 / Database Path
    db_box = patches.FancyBboxPatch((0.54, 0.35), 0.38, 0.28, boxstyle="round,pad=0.03", facecolor=WHITE, edgecolor=NAVY, linewidth=1.8)
    ax.add_patch(db_box)
    ax.text(0.73, 0.58, "OFF-CHAIN APPLICATION TIER", fontsize=10, weight='bold', color=NAVY, ha='center')
    ax.text(0.73, 0.52, "Next.js API Routes & PostgreSQL", fontsize=8.5, weight='bold', color=SLATE, ha='center')
    ax.text(0.73, 0.46, "- Prisma ORM 5.x Parameterized SQL\n- Product Details, Drafts & Media URLs\n- SIWE Nonce Challenge & JWT Sessions\n- High-Speed Query & Filter Indexes", fontsize=7.5, color=MUTED_SLATE, ha='center')

    # Bottom: Indexer Sync Tier
    idx_box = patches.FancyBboxPatch((0.08, 0.06), 0.84, 0.20, boxstyle="round,pad=0.03", facecolor=CARD_BG, edgecolor=BORDER, linewidth=1.5)
    ax.add_patch(idx_box)
    ax.text(0.5, 0.21, "AUTONOMOUS BACKGROUND EVENT INDEXER", fontsize=10, weight='bold', color=SLATE, ha='center')
    ax.text(0.5, 0.15, "Chunked Block Polling Daemon  |  Idempotent Event Log Ingestion (txHash + logIndex)\nState Snapshot Synchronization  |  Zero-Login Public Hash Recomputation (/verify/[id])", fontsize=8, color=MUTED_SLATE, ha='center')

    # Arrows
    # Client -> Blockchain
    ax.annotate("", xy=(0.27, 0.63), xytext=(0.27, 0.72), arrowprops=dict(arrowstyle="->", color=ORANGE, lw=1.8))
    ax.text(0.18, 0.67, "EIP-712 / Signed Tx", fontsize=7, color=ORANGE, weight='bold')

    # Client -> API
    ax.annotate("", xy=(0.73, 0.63), xytext=(0.73, 0.72), arrowprops=dict(arrowstyle="->", color=NAVY, lw=1.8))
    ax.text(0.74, 0.67, "HTTPS REST / Cookie", fontsize=7, color=NAVY, weight='bold')

    # Blockchain -> Indexer
    ax.annotate("", xy=(0.27, 0.26), xytext=(0.27, 0.35), arrowprops=dict(arrowstyle="->", color=ORANGE, lw=1.8))
    ax.text(0.17, 0.30, "eth_getLogs / Events", fontsize=7, color=ORANGE, weight='bold')

    # Indexer -> Database
    ax.annotate("", xy=(0.73, 0.35), xytext=(0.73, 0.26), arrowprops=dict(arrowstyle="->", color=NAVY, lw=1.8))
    ax.text(0.74, 0.30, "Upsert State Mirror", fontsize=7, color=NAVY, weight='bold')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    save_fig(fig, "fig1_system_architecture.png")

# ==============================================================================
# FIGURE 2: PRODUCT LIFECYCLE & STATE MACHINE
# ==============================================================================
def gen_fig2():
    fig, ax = plt.subplots(figsize=(11, 4.5), dpi=300)
    fig.patch.set_facecolor(LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    ax.text(0.5, 0.90, "ChainTrack Product Lifecycle & State Machine", fontsize=13, weight='bold', color=SLATE, ha='center')

    states = [
        ("Created (0)", "Manufacturer\nRegisters Unit", 0.12),
        ("InTransit (1)", "Handover Initiated\nPending Receiver", 0.36),
        ("AtDistributor (2)", "Distributor Accepts\nCustody Claimed", 0.60),
        ("AtRetailer (3)", "Retailer Accepts\nInventory Stocked", 0.84)
    ]

    for title, desc, x in states:
        box = patches.FancyBboxPatch((x-0.09, 0.45), 0.18, 0.28, boxstyle="round,pad=0.02", facecolor=WHITE, edgecolor=NAVY, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, 0.64, title, fontsize=9, weight='bold', color=NAVY, ha='center')
        ax.text(x, 0.52, desc, fontsize=7.5, color=MUTED_SLATE, ha='center')

    # Sold Terminal State
    sold_box = patches.FancyBboxPatch((0.75, 0.08), 0.18, 0.22, boxstyle="round,pad=0.02", facecolor=CARD_BG, edgecolor=GREEN, linewidth=2)
    ax.add_patch(sold_box)
    ax.text(0.84, 0.23, "Sold (4)", fontsize=10, weight='bold', color=GREEN, ha='center')
    ax.text(0.84, 0.13, "Terminal Finality\nNo Further Edits", fontsize=7.5, color=MUTED_SLATE, ha='center')

    # Forward Transitions
    ax.annotate("", xy=(0.27, 0.59), xytext=(0.21, 0.59), arrowprops=dict(arrowstyle="->", color=ORANGE, lw=1.5))
    ax.text(0.24, 0.62, "initiate", fontsize=7, color=ORANGE, ha='center', weight='bold')

    ax.annotate("", xy=(0.51, 0.59), xytext=(0.45, 0.59), arrowprops=dict(arrowstyle="->", color=GREEN, lw=1.5))
    ax.text(0.48, 0.62, "accept", fontsize=7, color=GREEN, ha='center', weight='bold')

    ax.annotate("", xy=(0.75, 0.59), xytext=(0.69, 0.59), arrowprops=dict(arrowstyle="->", color=GREEN, lw=1.5))
    ax.text(0.72, 0.62, "accept", fontsize=7, color=GREEN, ha='center', weight='bold')

    # Mark Sold Transition
    ax.annotate("", xy=(0.84, 0.30), xytext=(0.84, 0.45), arrowprops=dict(arrowstyle="->", color=GREEN, lw=1.8))
    ax.text(0.88, 0.37, "markSold()", fontsize=7.5, color=GREEN, weight='bold')

    # Rejection Transitions (Curved red arrows)
    ax.annotate("", xy=(0.12, 0.45), xytext=(0.36, 0.45),
                arrowprops=dict(arrowstyle="->", color=RED, lw=1.3, connectionstyle="arc3,rad=0.35"))
    ax.text(0.24, 0.33, "rejectTransfer() &rarr; Rollback to Created", fontsize=7, color=RED, ha='center')

    ax.annotate("", xy=(0.60, 0.45), xytext=(0.84, 0.45),
                arrowprops=dict(arrowstyle="->", color=RED, lw=1.3, connectionstyle="arc3,rad=0.35"))
    ax.text(0.72, 0.33, "rejectTransfer() &rarr; Rollback to AtDistributor", fontsize=7, color=RED, ha='center')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    save_fig(fig, "fig2_product_lifecycle.png")

# ==============================================================================
# FIGURE 3: TWO-STEP CUSTODY TRANSFER PROTOCOL
# ==============================================================================
def gen_fig3():
    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
    fig.patch.set_facecolor(LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    ax.text(0.5, 0.92, "Two-Step Escrow Handover Protocol", fontsize=13, weight='bold', color=SLATE, ha='center')

    # Actors
    ax.text(0.2, 0.82, "Current Owner (Sender)", fontsize=10, weight='bold', color=NAVY, ha='center')
    ax.text(0.5, 0.82, "Ethereum Smart Contract", fontsize=10, weight='bold', color=ORANGE, ha='center')
    ax.text(0.8, 0.82, "Designated Receiver", fontsize=10, weight='bold', color=NAVY, ha='center')

    # Step 1: Initiate
    ax.annotate("", xy=(0.48, 0.68), xytext=(0.22, 0.68), arrowprops=dict(arrowstyle="->", color=NAVY, lw=1.5))
    ax.text(0.35, 0.71, "1. initiateTransfer(id, to, loc, note)", fontsize=7.5, color=NAVY, ha='center', weight='bold')

    # Contract State change
    ax.text(0.5, 0.62, "Status = IN_TRANSIT\nPendingReceiver = to", fontsize=7, color=ORANGE, ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor=WHITE, edgecolor=ORANGE, lw=1))

    # Receiver Choice: Accept or Reject
    ax.annotate("", xy=(0.78, 0.48), xytext=(0.52, 0.48), arrowprops=dict(arrowstyle="->", color=MUTED_SLATE, lw=1.2, linestyle='--'))
    ax.text(0.65, 0.51, "Inspect Physical Goods", fontsize=7.5, color=MUTED_SLATE, ha='center')

    # Step 2A: Accept
    ax.annotate("", xy=(0.52, 0.35), xytext=(0.78, 0.35), arrowprops=dict(arrowstyle="->", color=GREEN, lw=1.5))
    ax.text(0.65, 0.38, "2A. acceptTransfer(id, location)", fontsize=7.5, color=GREEN, ha='center', weight='bold')
    ax.text(0.5, 0.28, "Owner = Receiver | Status = AtDistributor/Retailer", fontsize=7, color=GREEN, ha='center')

    # Step 2B: Reject
    ax.annotate("", xy=(0.52, 0.16), xytext=(0.78, 0.16), arrowprops=dict(arrowstyle="->", color=RED, lw=1.5))
    ax.text(0.65, 0.19, "2B. rejectTransfer(id, reason)", fontsize=7.5, color=RED, ha='center', weight='bold')
    ax.text(0.5, 0.09, "Owner Unchanged | Status Reverted", fontsize=7, color=RED, ha='center')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    save_fig(fig, "fig3_custody_transfer_protocol.png")

# ==============================================================================
# FIGURE 4: DATABASE ENTITY RELATIONSHIP DIAGRAM (ERD)
# ==============================================================================
def gen_fig4():
    fig, ax = plt.subplots(figsize=(11, 5.5), dpi=300)
    fig.patch.set_facecolor(LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)

    ax.text(0.5, 0.94, "ChainTrack PostgreSQL Entity Relationship Diagram (Prisma)", fontsize=13, weight='bold', color=SLATE, ha='center')

    # Entity: Participant
    p_box = patches.FancyBboxPatch((0.05, 0.48), 0.26, 0.38, boxstyle="round,pad=0.02", facecolor=WHITE, edgecolor=NAVY, linewidth=1.5)
    ax.add_patch(p_box)
    ax.text(0.18, 0.82, "PARTICIPANT", fontsize=9, weight='bold', color=NAVY, ha='center')
    ax.text(0.07, 0.74, "id: String (PK, cuid)\nwalletAddress: String (UK)\nrole: Enum (Role)\nisActive: Boolean\norganizationName: String?\ncontactEmail: String?\nlocation: String?", fontsize=7.5, color=SLATE, va='top')

    # Entity: Product
    pr_box = patches.FancyBboxPatch((0.37, 0.35), 0.28, 0.51, boxstyle="round,pad=0.02", facecolor=WHITE, edgecolor=ORANGE, linewidth=1.8)
    ax.add_patch(pr_box)
    ax.text(0.51, 0.82, "PRODUCT", fontsize=9, weight='bold', color=ORANGE, ha='center')
    ax.text(0.39, 0.74, "id: String (PK, draftId)\nchainProductId: Int? (UK)\nserialNumber: String (UK)\ndataHash: String (UK, 0x..)\nname, category: String\nbatchNumber: String\nmanufacturingDate: Date\ncurrentOwner: String?\ncurrentStatus: Enum?\nisConfirmed: Boolean", fontsize=7.5, color=SLATE, va='top')

    # Entity: ProductEvent
    pe_box = patches.FancyBboxPatch((0.71, 0.48), 0.25, 0.38, boxstyle="round,pad=0.02", facecolor=WHITE, edgecolor=NAVY, linewidth=1.5)
    ax.add_patch(pe_box)
    ax.text(0.835, 0.82, "PRODUCT_EVENT", fontsize=9, weight='bold', color=NAVY, ha='center')
    ax.text(0.73, 0.74, "id: String (PK, cuid)\nchainProductId: Int\neventType: Enum\nactor: String\ncounterparty: String?\nblockNumber, txHash\nlogIndex: Int\n@@unique([txHash, logIndex])", fontsize=7.5, color=SLATE, va='top')

    # Entity: AuthNonce & IndexerState
    an_box = patches.FancyBboxPatch((0.05, 0.08), 0.26, 0.28, boxstyle="round,pad=0.02", facecolor=WHITE, edgecolor=BORDER, linewidth=1.2)
    ax.add_patch(an_box)
    ax.text(0.18, 0.32, "AUTH_NONCE", fontsize=8.5, weight='bold', color=SLATE, ha='center')
    ax.text(0.07, 0.25, "id: String (PK)\naddress: String\nnonce: String (UK)\nexpiresAt: DateTime\nusedAt: DateTime?", fontsize=7, color=MUTED_SLATE, va='top')

    is_box = patches.FancyBboxPatch((0.71, 0.08), 0.25, 0.28, boxstyle="round,pad=0.02", facecolor=WHITE, edgecolor=BORDER, linewidth=1.2)
    ax.add_patch(is_box)
    ax.text(0.835, 0.32, "INDEXER_STATE", fontsize=8.5, weight='bold', color=SLATE, ha='center')
    ax.text(0.73, 0.25, "id: String (PK, 'main')\nlastProcessedBlock: Int\nupdatedAt: DateTime", fontsize=7, color=MUTED_SLATE, va='top')

    # Relationship Lines
    ax.annotate("", xy=(0.37, 0.65), xytext=(0.31, 0.65), arrowprops=dict(arrowstyle="<->", color=NAVY, lw=1.2))
    ax.text(0.34, 0.68, "1 : N", fontsize=7, color=NAVY, ha='center')

    ax.annotate("", xy=(0.71, 0.65), xytext=(0.65, 0.65), arrowprops=dict(arrowstyle="<->", color=NAVY, lw=1.2))
    ax.text(0.68, 0.68, "1 : N\n(logical)", fontsize=6.5, color=NAVY, ha='center')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    save_fig(fig, "fig4_database_schema_erd.png")

# ==============================================================================
# GENERATE HIGH-RES MOCKUPS / SCREENSHOTS
# ==============================================================================
def create_ui_screen(filename, title_text, main_content_fn):
    W, H = 1200, 680
    im = Image.new('RGB', (W, H), color='#0F172A')
    draw = ImageDraw.Draw(im)

    # Top Navbar
    draw.rectangle([0, 0, W, 64], fill='#173B57')
    draw.rectangle([0, 63, W, 64], fill='#334155')

    # Brand
    draw.text((32, 20), "ChainTrack", fill='#FFFFFF')
    draw.text((120, 22), "Supply Chain Traceability", fill='#94A3B8')

    # Nav links
    draw.text((800, 22), "Verify", fill='#F8FAFC')
    draw.text((880, 22), "Products", fill='#94A3B8')
    draw.text((980, 22), "Transfers", fill='#94A3B8')
    
    # Wallet badge
    draw.rounded_rectangle([1060, 14, 1170, 50], radius=6, fill='#F97316')
    draw.text((1075, 24), "0x7099...79C8", fill='#FFFFFF')

    # Page Header Banner
    draw.rectangle([0, 64, W, 124], fill='#1E293B')
    draw.text((32, 80), title_text, fill='#FFFFFF')
    draw.text((32, 102), "Ethereum Sepolia Network | Chain ID: 11155111 | Smart Contract: SupplyChain.sol", fill='#64748B')

    # Draw specific page content
    main_content_fn(draw, W, H)

    out_path = os.path.join(ASSETS_DIR, filename)
    im.save(out_path, quality=95)
    print(f"Generated UI: {filename}")

# Fig 5: Landing Page
def content_landing(draw, W, H):
    # Hero Card
    draw.rounded_rectangle([200, 180, 1000, 480], radius=12, fill='#1E293B', outline='#334155', width=2)
    draw.text((320, 220), "Verify Product Authenticity Instantly", fill='#FFFFFF')
    draw.text((330, 255), "Zero-login public traceability anchored on the Ethereum blockchain", fill='#94A3B8')

    # Search Box
    draw.rounded_rectangle([300, 310, 800, 370], radius=8, fill='#0F172A', outline='#64748B', width=1)
    draw.text((330, 332), "Enter Product ID or Serial Number (e.g., 1)...", fill='#64748B')
    draw.rounded_rectangle([810, 310, 900, 370], radius=8, fill='#2563EB')
    draw.text((835, 332), "Verify", fill='#FFFFFF')

    # QR Scan Button
    draw.rounded_rectangle([450, 400, 750, 450], radius=8, fill='#173B57', outline='#38BDF8', width=1)
    draw.text((510, 417), "Scan QR Code with Camera", fill='#38BDF8')

def gen_fig5():
    create_ui_screen("fig5_landing_page.png", "Public Verification Portal", content_landing)

# Fig 6: Wallet Login
def content_login(draw, W, H):
    draw.rounded_rectangle([350, 170, 850, 520], radius=12, fill='#1E293B', outline='#334155', width=2)
    draw.text((460, 210), "Sign-In with Ethereum", fill='#FFFFFF')
    draw.text((410, 240), "Authenticate using your cryptographic wallet (EIP-4361)", fill='#94A3B8')

    # Nonce Challenge Box
    draw.rounded_rectangle([390, 280, 810, 380], radius=6, fill='#0F172A', outline='#475569')
    draw.text((410, 295), "Domain: chaintrack.eth", fill='#E2E8F0')
    draw.text((410, 315), "Nonce: a8f9c2d1e0b3... (Expires in 5m)", fill='#94A3B8')
    draw.text((410, 335), "Role: Role.Manufacturer (Acme Manufacturing)", fill='#10B981')
    draw.text((410, 355), "Statement: Sign to authorize session for ChainTrack.", fill='#64748B')

    # Connect Button
    draw.rounded_rectangle([420, 420, 780, 470], radius=8, fill='#F97316')
    draw.text((510, 437), "Sign Message with MetaMask", fill='#FFFFFF')

def gen_fig6():
    create_ui_screen("fig6_wallet_auth.png", "Cryptographic Authentication & Access Control", content_login)

# Fig 7: Dashboard
def content_dashboard(draw, W, H):
    # Metric Cards
    metrics = [
        ("Total Registered", "148", '#2563EB', 32),
        ("In Transit", "24", '#F59E0B', 324),
        ("At Distributor", "45", '#8B5CF6', 616),
        ("Sold (Final)", "79", '#10B981', 908)
    ]
    for label, count, col, x in metrics:
        draw.rounded_rectangle([x, 150, x+260, 230], radius=8, fill='#1E293B', outline=col, width=2)
        draw.text((x+20, 165), label, fill='#94A3B8')
        draw.text((x+20, 190), count, fill='#FFFFFF')

    # Recent Table Header
    draw.rounded_rectangle([32, 260, 1168, 620], radius=8, fill='#1E293B', outline='#334155')
    draw.text((50, 280), "Manufacturer Inventory & Product Lifecycle Status", fill='#FFFFFF')

    # Table rows
    draw.rectangle([50, 320, 1150, 350], fill='#0F172A')
    draw.text((60, 328), "ID    Product Name                 Batch           Status          Current Owner         Created", fill='#94A3B8')

    rows = [
        ("1     Smart Health Tracker Pro     BATCH-2026-X1   CREATED         0x7099...79c8 (Acme)  2026-09-15", '#38BDF8'),
        ("2     Industrial IoT Gateway X     BATCH-2026-B2   IN_TRANSIT      0x7099...79c8 (Acme)  2026-09-16", '#F59E0B'),
        ("3     Precision Sensor Array       BATCH-2026-S9   AT_DISTRIBUTOR  0x3c44...90b1 (Swift) 2026-09-17", '#8B5CF6'),
        ("4     Cardiac Pulse Monitor V2     BATCH-2026-C4   SOLD            0x90f7...22e4 (Metro) 2026-09-18", '#10B981'),
    ]
    y = 360
    for r_text, col in rows:
        draw.text((60, y), r_text, fill=col)
        draw.line([50, y+24, 1150, y+24], fill='#334155')
        y += 35

def gen_fig7():
    create_ui_screen("fig7_dashboard.png", "Enterprise Manufacturer Dashboard", content_dashboard)

# Fig 8: Product Registration
def content_new_product(draw, W, H):
    draw.rounded_rectangle([150, 150, 1050, 620], radius=10, fill='#1E293B', outline='#334155')
    draw.text((180, 175), "Register New Product (Solidity registerProduct)", fill='#FFFFFF')
    draw.text((180, 200), "Creates canonical metadata digest & registers on-chain token ID", fill='#94A3B8')

    fields = [
        ("Product Name *", "Smart Health Tracker Pro", 240),
        ("Category *", "Medical Electronics", 310),
        ("Batch Number *", "BATCH-2026-X1", 380),
        ("Manufacturing Date *", "2026-09-15", 450),
        ("Initial Facility Location *", "Apex Factory Floor 4, Munich", 520)
    ]
    for label, val, y in fields:
        draw.text((180, y), label, fill='#94A3B8')
        draw.rounded_rectangle([420, y-8, 1000, y+24], radius=4, fill='#0F172A', outline='#475569')
        draw.text((435, y-2), val, fill='#FFFFFF')

    draw.rounded_rectangle([750, 565, 1000, 605], radius=6, fill='#F97316')
    draw.text((800, 578), "Register On-Chain", fill='#FFFFFF')

def gen_fig8():
    create_ui_screen("fig8_product_registration.png", "Product Registration & Canonical Hash Generation", content_new_product)

# Fig 9: Product Details & QR
def content_product_detail(draw, W, H):
    # Left Details
    draw.rounded_rectangle([50, 150, 750, 620], radius=8, fill='#1E293B', outline='#334155')
    draw.text((80, 175), "Product #1: Smart Health Tracker Pro", fill='#FFFFFF')
    draw.rounded_rectangle((600, 170, 720, 200), radius=4, fill='#10B981')
    draw.text((620, 178), "CREATED", fill='#FFFFFF')

    info = [
        ("Serial Number (UUID):", "3f2b6c1e-8a55-4c19-9a42-0d7f9b1e6a10"),
        ("On-Chain Keccak-256 Hash:", "0x8a7f4b2c1e9d0a55...b91e6a107f9b"),
        ("Manufacturer Wallet:", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
        ("Current Owner:", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Acme)"),
        ("Batch / Date:", "BATCH-2026-X1 | 2026-09-15"),
        ("Blockchain Tx Hash:", "0x4e8a1c9b2f...7d8e (Block #482910)")
    ]
    y = 230
    for label, val in info:
        draw.text((80, y), label, fill='#94A3B8')
        draw.text((300, y), val, fill='#F8FAFC')
        y += 35

    # Right QR Box
    draw.rounded_rectangle([780, 150, 1150, 620], radius=8, fill='#1E293B', outline='#334155')
    draw.text((870, 175), "Product Identity QR", fill='#FFFFFF')

    # Draw QR code representation
    draw.rounded_rectangle([840, 220, 1090, 470], radius=8, fill='#FFFFFF')
    draw.rectangle([860, 240, 920, 300], fill='#000000')
    draw.rectangle([1010, 240, 1070, 300], fill='#000000')
    draw.rectangle([860, 390, 920, 450], fill='#000000')
    draw.text((890, 330), "QR CODE", fill='#000000')

    draw.text((820, 490), "URL: https://chaintrack.io/verify/1", fill='#38BDF8')
    draw.rounded_rectangle([870, 530, 1060, 570], radius=6, fill='#2563EB')
    draw.text((905, 545), "Download QR", fill='#FFFFFF')

def gen_fig9():
    create_ui_screen("fig9_product_qr_details.png", "Product Digital Identity & QR Tag", content_product_detail)

# Fig 10: Custody Transfer
def content_transfer(draw, W, H):
    draw.rounded_rectangle([200, 160, 1000, 580], radius=10, fill='#1E293B', outline='#334155')
    draw.text((240, 190), "Initiate Custody Transfer (initiateTransfer)", fill='#FFFFFF')
    draw.text((240, 215), "Transfers product ownership to next authorized participant role", fill='#94A3B8')

    items = [
        ("Product ID / Name:", "#1 - Smart Health Tracker Pro"),
        ("Current Owner:", "0x7099...79c8 (Acme Manufacturing)"),
        ("Select Receiver Role *:", "Distributor (Role.Distributor)"),
        ("Target Receiver Wallet *:", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (SwiftLogistics)"),
        ("Dispatch Location *:", "Munich Logistics Center Hub 4"),
        ("Transit / Waybill Note:", "Consignment dispatched via Freight Air #LH402")
    ]
    y = 260
    for label, val in items:
        draw.text((240, y), label, fill='#94A3B8')
        draw.text((480, y), val, fill='#FFFFFF')
        y += 40

    draw.rounded_rectangle([680, 510, 950, 550], radius=6, fill='#F97316')
    draw.text((725, 523), "Sign Transfer on MetaMask", fill='#FFFFFF')

def gen_fig10():
    create_ui_screen("fig10_transfer_initiation.png", "Custody Transfer Initiation Interface", content_transfer)

# Fig 11: Transfer Acceptance / Rejection
def content_accept(draw, W, H):
    draw.rounded_rectangle([50, 150, 1150, 580], radius=8, fill='#1E293B', outline='#334155')
    draw.text((80, 180), "Pending Incoming Goods (Role.Distributor View)", fill='#FFFFFF')

    # Pending Card
    draw.rounded_rectangle([80, 220, 1120, 400], radius=6, fill='#0F172A', outline='#F59E0B')
    draw.text((100, 240), "Product #1: Smart Health Tracker Pro  |  From: Acme Manufacturing", fill='#FFFFFF')
    draw.text((100, 270), "Waybill Note: Consignment dispatched via Freight Air #LH402", fill='#94A3B8')
    draw.text((100, 295), "Dispatch Time: 2026-09-15 14:32 UTC  |  Status: IN_TRANSIT", fill='#F59E0B')

    # Location input
    draw.text((100, 335), "Receiving Inspection Location: Central Logistics Hub, Frankfurt", fill='#E2E8F0')

    # Action Buttons
    draw.rounded_rectangle([750, 330, 900, 375], radius=6, fill='#10B981')
    draw.text((790, 345), "Accept", fill='#FFFFFF')

    draw.rounded_rectangle([920, 330, 1070, 375], radius=6, fill='#EF4444')
    draw.text((965, 345), "Reject", fill='#FFFFFF')

def gen_fig11():
    create_ui_screen("fig11_transfer_acceptance.png", "Distributor Inbound Custody Acceptance Interface", content_accept)

# Fig 12: Public Verification AUTHENTIC
def content_verify_authentic(draw, W, H):
    # Banner
    draw.rounded_rectangle([50, 150, 1150, 230], radius=8, fill='#064E3B', outline='#10B981', width=2)
    draw.text((100, 175), "VERDICT: AUTHENTIC PRODUCT", fill='#10B981')
    draw.text((100, 200), "Blockchain Keccak-256 hash matches PostgreSQL metadata record exactly.", fill='#A7F3D0')

    # Summary
    draw.rounded_rectangle([50, 250, 550, 620], radius=8, fill='#1E293B', outline='#334155')
    draw.text((70, 270), "Product Specifications", fill='#FFFFFF')
    specs = [
        ("Name:", "Smart Health Tracker Pro"),
        ("Category:", "Medical Electronics"),
        ("Batch Number:", "BATCH-2026-X1"),
        ("Manufacturing Date:", "2026-09-15"),
        ("Manufacturer:", "Acme Manufacturing (0x7099...79c8)"),
        ("Current Owner:", "MetroRetail Hub (0x90f7...22e4)"),
        ("Final Status:", "SOLD (Terminal Finality)")
    ]
    y = 310
    for l, v in specs:
        draw.text((70, y), l, fill='#94A3B8')
        draw.text((220, y), v, fill='#FFFFFF')
        y += 35

    # Timeline
    draw.rounded_rectangle([580, 250, 1150, 620], radius=8, fill='#1E293B', outline='#334155')
    draw.text((600, 270), "Immutable Blockchain Audit Trail", fill='#FFFFFF')

    events = [
        ("REGISTERED", "Acme Manufacturing (Munich Floor 4)", "2026-09-15 10:00", '#38BDF8'),
        ("TRANSFER_INITIATED", "In Transit to SwiftLogistics", "2026-09-15 14:30", '#F59E0B'),
        ("TRANSFER_ACCEPTED", "SwiftLogistics (Frankfurt Hub)", "2026-09-16 09:15", '#10B981'),
        ("LOCATION_UPDATE", "Cold Storage Vault 2 (Temp 4C)", "2026-09-16 16:00", '#8B5CF6'),
        ("TRANSFER_ACCEPTED", "MetroRetail Hub (Store 12)", "2026-09-17 11:00", '#10B981'),
        ("SOLD", "Sold to End Consumer (Register 3)", "2026-09-18 15:45", '#10B981')
    ]
    y = 310
    for ev, loc, t_str, col in events:
        draw.text((600, y), f"&bull; {ev}: {loc}", fill=col)
        draw.text((1000, y), t_str, fill='#64748B')
        y += 40

def gen_fig12():
    create_ui_screen("fig12_verification_authentic.png", "Public Verification — Authentic Verdict & Timeline", content_verify_authentic)

# Fig 13: Tamper Detection DATA MISMATCH
def content_verify_mismatch(draw, W, H):
    # Warning Banner
    draw.rounded_rectangle([50, 150, 1150, 230], radius=8, fill='#78350F', outline='#F59E0B', width=2)
    draw.text((100, 175), "VERDICT: DATA MISMATCH (SECURITY ALERT)", fill='#F59E0B')
    draw.text((100, 200), "Warning: Off-chain database metadata has been altered and does NOT match the immutable on-chain hash.", fill='#FDE68A')

    draw.rounded_rectangle([50, 250, 1150, 620], radius=8, fill='#1E293B', outline='#EF4444')
    draw.text((80, 280), "Cryptographic Digest Discrepancy Analysis", fill='#FFFFFF')

    draw.text((80, 330), "Blockchain Sealed Hash (SupplyChain.sol):", fill='#94A3B8')
    draw.text((80, 355), "0x8a7f4b2c1e9d0a55...b91e6a107f9b (Immutable on Block #482910)", fill='#10B981')

    draw.text((80, 410), "Recomputed Live Database Hash (keccak256):", fill='#94A3B8')
    draw.text((80, 435), "0x3c9e8a1f4b0029d1...aa419f0022cc (Calculated from modified database row)", fill='#EF4444')

    draw.text((80, 490), "Tampered Field Detected:", fill='#94A3B8')
    draw.text((80, 515), "Original: batchNumber = 'BATCH-2026-X1'  &rarr;  Current Database: batchNumber = 'BATCH-FAKE-99'", fill='#F59E0B')

def gen_fig13():
    create_ui_screen("fig13_tamper_detection_mismatch.png", "Tamper Detection — Data Mismatch Security Alert", content_verify_mismatch)

# Fig 14: Indexer Daemon
def content_indexer(draw, W, H):
    draw.rounded_rectangle([50, 150, 1150, 620], radius=8, fill='#0F172A', outline='#334155')
    draw.text((80, 180), "Background Indexer Daemon Terminal (src/indexer-daemon.ts)", fill='#10B981')

    logs = [
        "[INFO] Indexer Daemon initialized. Chain ID: 11155111 (Sepolia)",
        "[INFO] Connected to PostgreSQL. IndexerState cursor: block #482900",
        "[INFO] Scanning blocks 482901 to 483100 (Chunk size: 2000, Confirmations: 2)",
        "[SYNC] Ingested log: ProductRegistered (id: 1, tx: 0x4e8a...7d8e, logIndex: 0)",
        "[SYNC] Ingested log: TransferInitiated (id: 1, from: 0x7099, to: 0x3c44, tx: 0x11ab...33cd)",
        "[SYNC] Ingested log: TransferAccepted (id: 1, by: 0x3c44, tx: 0x99ef...88aa)",
        "[SYNC] Updated IndexerState.lastProcessedBlock = 483100 (0 errors, 3 events indexed)",
        "[HEARTBEAT] Idle. Polling tick in 15 seconds..."
    ]
    y = 230
    for l in logs:
        draw.text((80, y), l, fill='#E2E8F0')
        y += 40

def gen_fig14():
    create_ui_screen("fig14_indexer_daemon_log.png", "Background Indexer Daemon Synchronization", content_indexer)

if __name__ == "__main__":
    print("Generating all report figures...")
    gen_fig1()
    gen_fig2()
    gen_fig3()
    gen_fig4()
    gen_fig5()
    gen_fig6()
    gen_fig7()
    gen_fig8()
    gen_fig9()
    gen_fig10()
    gen_fig11()
    gen_fig12()
    gen_fig13()
    gen_fig14()
    print("All 14 figures generated successfully in report_assets directory!")
