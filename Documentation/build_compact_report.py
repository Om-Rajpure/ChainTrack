import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_page_number(run):
    fldChar1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
    instrText = parse_xml(f'<w:instrText {nsdecls("w")} xml:space="preserve"> PAGE </w:instrText>')
    fldChar2 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="separate"/>')
    fldChar3 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)

def build_compact_report(output_filename):
    doc = Document()

    # -------------------------------------------------------------
    # SECTION 1: COVER PAGE
    # -------------------------------------------------------------
    sec1 = doc.sections[0]
    sec1.page_width = Inches(8.27)
    sec1.page_height = Inches(11.69)
    sec1.top_margin = Inches(0.8)
    sec1.bottom_margin = Inches(0.8)
    sec1.left_margin = Inches(1.0)
    sec1.right_margin = Inches(1.0)
    sec1.header.is_linked_to_previous = False
    sec1.footer.is_linked_to_previous = False

    # Base font
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Times New Roman'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(15, 23, 42)

    # Cover Page Elements
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("Experiment No. 10")
    r.bold = True
    r.font.size = Pt(12)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("ChainTrack: A Blockchain-Based Supply Chain Tracker")
    r.bold = True
    r.font.size = Pt(18)
    r.font.color.rgb = RGBColor(23, 59, 87)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Submitted in partial fulfillment of the requirements of")
    r.font.size = Pt(10.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Mini Project")
    r.bold = True
    r.font.size = Pt(11.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("in")
    r.font.size = Pt(10.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("B.E. (Artificial Intelligence and Data Science)")
    r.bold = True
    r.font.size = Pt(11.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("By")
    r.font.size = Pt(10.5)

    # Student Table
    t_students = doc.add_table(rows=4, cols=2)
    t_students.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_students, "CBD5E1")
    col_widths = [Inches(2.8), Inches(1.6)]
    
    headers = ["Name", "Roll Number"]
    students = [
        ("Veenus Patil", "08"),
        ("Om Rajpure", "15"),
        ("Omkar Gend", "74")
    ]

    for j, h in enumerate(headers):
        cell = t_students.cell(0, j)
        cell.width = col_widths[j]
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, 50, 50, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(10)

    for i, (name, roll) in enumerate(students):
        row = t_students.rows[i+1]
        for j, val in enumerate([name, roll]):
            cell = row.cells[j]
            cell.width = col_widths[j]
            set_cell_margins(cell, 40, 40, 80, 80)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(val)
            r.font.size = Pt(9.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Supervisor:")
    r.font.size = Pt(10.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("Prof. Shubhangi Katke")
    r.bold = True
    r.font.size = Pt(11)

    # Logo
    logo_path = r"D:\Projects\BlockChain\Documentation\report_assets\dmce_logo.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(4)
        p_logo.paragraph_format.space_after = Pt(8)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.05))

    footer_lines = [
        ("Department of Artificial Intelligence and Data Science", True, 12),
        ("DATTA MEGHE COLLEGE OF ENGINEERING, AIROLI,", True, 12),
        ("NAVI MUMBAI – 400 708.", True, 12),
        ("University of Mumbai", True, 12),
        ("(A.Y. 2026–27)", False, 10.5)
    ]
    for text, bold, sz in footer_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(1.5)
        r = p.add_run(text)
        r.bold = bold
        r.font.size = Pt(sz)

    # -------------------------------------------------------------
    # SECTION 2: BODY (Headers, Footers, Page Numbers)
    # -------------------------------------------------------------
    sec2 = doc.add_section()
    sec2.page_width = Inches(8.27)
    sec2.page_height = Inches(11.69)
    sec2.top_margin = Inches(0.9)
    sec2.bottom_margin = Inches(0.85)
    sec2.left_margin = Inches(1.0)
    sec2.right_margin = Inches(1.0)

    header = sec2.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hr = hp.add_run("Datta Meghe College of Engineering, Airoli")
    hr.font.name = 'Times New Roman'
    hr.font.size = Pt(8.5)
    hr.font.color.rgb = RGBColor(100, 116, 139)

    footer = sec2.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr_prefix = fp.add_run("Department of AI & DS | Page ")
    fr_prefix.font.name = 'Times New Roman'
    fr_prefix.font.size = Pt(9)
    fr_prefix.font.color.rgb = RGBColor(100, 116, 139)
    fr_num = fp.add_run()
    fr_num.font.name = 'Times New Roman'
    fr_num.font.size = Pt(9)
    fr_num.font.color.rgb = RGBColor(100, 116, 139)
    add_page_number(fr_num)

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(13.5)
        r.font.color.rgb = RGBColor(23, 59, 87)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(11.5)
        r.font.color.rgb = RGBColor(249, 115, 22)
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(10.5)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_body(text, bold_prefix=None, space_after=4):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.12
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
        r = p.add_run(text)
        r.font.size = Pt(10)
        return p

    def add_figure(img_filename, caption_text, width_inches=4.8):
        img_path = os.path.join(r"D:\Projects\BlockChain\Documentation\report_assets", img_filename)
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(6)
            p_img.paragraph_format.space_after = Pt(2)
            p_img.add_run().add_picture(img_path, width=Inches(width_inches))
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(1)
            p_cap.paragraph_format.space_after = Pt(6)
            r_cap = p_cap.add_run(caption_text)
            r_cap.italic = True
            r_cap.font.size = Pt(9)
            r_cap.font.color.rgb = RGBColor(71, 85, 105)

    def add_custom_table(headers, rows_data, col_widths, align_center=False):
        table = doc.add_table(rows=len(rows_data)+1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, "CBD5E1")

        for j, h in enumerate(headers):
            cell = table.cell(0, j)
            cell.width = Inches(col_widths[j])
            set_cell_background(cell, "F1F5F9")
            set_cell_margins(cell, 40, 40, 60, 60)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if align_center else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(h)
            r.bold = True
            r.font.size = Pt(9)

        for i, row in enumerate(rows_data):
            for j, val in enumerate(row):
                cell = table.cell(i+1, j)
                cell.width = Inches(col_widths[j])
                set_cell_margins(cell, 35, 35, 60, 60)
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (align_center and j == 0) else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(str(val))
                r.font.size = Pt(8.5)
        
        p_sp = doc.add_paragraph()
        p_sp.paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # PAGE 2: CERTIFICATE & ABSTRACT (Combined)
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("CERTIFICATE")
    r.bold = True
    r.font.size = Pt(14)
    r.font.color.rgb = RGBColor(23, 59, 87)

    add_body("This is to certify that the mini project entitled “ChainTrack: A Blockchain-Based Supply Chain Tracker” is a bonafide work carried out by Veenus Patil (08), Om Rajpure (15), and Omkar Gend (74) in partial fulfillment of the requirements for the award of the Degree of Bachelor of Engineering in Artificial Intelligence and Data Science from the University of Mumbai during the academic year 2026–27.")

    add_body("The work presented in this report is an original record of the investigation and implementation carried out by the students under my supervision, and has not been submitted elsewhere for any other degree or diploma.")

    # Signature Table
    p_sig = doc.add_paragraph()
    p_sig.paragraph_format.space_before = Pt(18)
    p_sig.paragraph_format.space_after = Pt(2)
    t_sig = doc.add_table(rows=2, cols=3)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_widths = [Inches(2.1), Inches(2.1), Inches(2.1)]
    sig_data = [
        ("Prof. Shubhangi Katke", "Dr. [HOD NAME]", "Dr. [PRINCIPAL NAME]"),
        ("Project Guide", "Head of Department\nDept. of AI & DS", "Principal\nDMCE, Airoli")
    ]
    for i in range(2):
        for j in range(3):
            cell = t_sig.cell(i, j)
            cell.width = sig_widths[j]
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(sig_data[i][j])
            if i == 0:
                r.bold = True
                r.font.size = Pt(9.5)
            else:
                r.font.size = Pt(8.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run("ABSTRACT")
    r.bold = True
    r.font.size = Pt(14)
    r.font.color.rgb = RGBColor(23, 59, 87)

    add_body("Global multi-tier supply chains suffer from severe information fragmentation, opacity, and unauthorized record modification. Because stakeholders maintain siloed, private relational databases, records can be silently edited or disputed. Consequently, counterfeit products enter transit channels undetected, causing over $450 billion in annual economic losses globally and severely endangering public safety in pharmaceutical and consumer sectors.")

    add_body("To address these trust deficits, this project introduces ChainTrack, a full-stack, hybrid Web3 traceability platform. ChainTrack permanently anchors product digital identities, role-based custody transitions, and cryptographic metadata digests on an Ethereum smart contract (SupplyChain.sol) while storing rich descriptive metadata off-chain in PostgreSQL. Inventory mutations follow a strict two-step escrow handover protocol (Initiate &rarr; InTransit &rarr; Accept/Reject), preventing unilateral inventory assignment and enforcing non-repudiation. An autonomous background indexer ingests blockchain event logs, ensures idempotent synchronization, and maintains relational snapshots. For end consumers, ChainTrack enables instant, zero-login public verification: scanning a physical QR code dynamically recomputes a Keccak-256 hash over canonical database metadata and verifies it against the immutable on-chain proof. Verified across 87 automated tests (100% statement coverage), ChainTrack demonstrates a practical, tamper-evident architecture for enterprise supply chain integrity.")

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 3: LIST OF FIGURES, TABLES & CONTENTS
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("LIST OF FIGURES")
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(23, 59, 87)

    figures_list = [
        ("Figure 1", "System architecture of ChainTrack (Dual-Pipeline Architecture)", "5"),
        ("Figure 2", "ChainTrack product lifecycle and finite state machine", "5"),
        ("Figure 3", "ChainTrack public landing page and instant verification portal", "6"),
        ("Figure 4", "Enterprise manufacturer dashboard with inventory metrics", "7"),
        ("Figure 5", "Product registration and canonical hash generation interface", "7"),
        ("Figure 6", "Product digital identity view with QR code generation", "8"),
        ("Figure 7", "Inbound custody transfer acceptance and rejection interface", "8"),
        ("Figure 8", "Public product verification interface displaying AUTHENTIC verdict", "9"),
        ("Figure 9", "Simulated metadata tampering resulting in DATA MISMATCH security alert", "9")
    ]
    add_custom_table(["Figure No.", "Figure Caption", "Page"], figures_list, [1.0, 4.6, 0.7], align_center=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("LIST OF TABLES")
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(23, 59, 87)

    tables_list = [
        ("Table 1", "Technology stack components and selection rationale", "4"),
        ("Table 2", "Participant roles and on-chain permissions in SupplyChain.sol", "5"),
        ("Table 3", "Product lifecycle states and allowable state transitions", "5"),
        ("Table 4", "Software and hardware operational environment specifications", "6"),
        ("Table 5", "Automated testing results and verification observations", "10"),
        ("Table 6", "Comparative evaluation between conventional systems and ChainTrack", "10")
    ]
    add_custom_table(["Table No.", "Table Title", "Page"], tables_list, [1.0, 4.6, 0.7], align_center=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("CONTENTS")
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(23, 59, 87)

    toc_list = [
        ("1. INTRODUCTION", "Introduction, Literature Survey, Objectives, Tech Stack", "4"),
        ("2. SYSTEM DESIGN", "Architecture, Smart Contract, Environment Requirements", "5"),
        ("3. IMPLEMENTATION & RESULTS", "Modules 3.1.1–3.1.8, Testing Observations, Scope, Comparison", "6"),
        ("4. CONCLUSION & FUTURE WORK", "Conclusion, Planned Future Enhancements, References", "11")
    ]
    add_custom_table(["Section", "Topic Summary", "Page"], [[item[0], item[1], item[2]] for item in toc_list], [1.8, 3.8, 0.7])

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 4: 1. INTRODUCTION
    # -------------------------------------------------------------
    add_heading_1("1. INTRODUCTION")

    add_heading_2("1.1 Introduction")
    add_body("Modern commercial supply chains represent intricate ecosystems where products move through manufacturers, distributors, retailers, and end consumers. Despite ERP modernization, supply chain data remains siloed in private corporate databases where records can be silently edited, lost, or disputed. This opacity enables counterfeit products to enter transit channels undetected, causing massive financial losses and severe hazards in pharmaceutical and consumer markets. ChainTrack solves this trust deficit by implementing a hybrid blockchain architecture that permanently anchors custody handovers and metadata hashes on Ethereum while storing rich data in PostgreSQL.")

    add_heading_2("1.2 Literature Survey")
    add_body("S. Nakamoto (2008) [1] established trustless decentralized transaction ledgers. G. Wood (2014) [2] and N. Szabo (1997) [3] formalized smart contract execution on the Ethereum Virtual Machine (EVM). E. Androulaki et al. (2018) [4] demonstrated that role-based access control and deterministic state execution are critical for multi-party supply chains. NIST FIPS PUB 180-4 [5] standardized cryptographic hashing (SHA-256/Keccak), enabling mathematical tamper detection. EIP-4361 (Sign-In with Ethereum) [6] established passwordless wallet authentication via ECDSA signatures.")

    add_heading_2("1.3 Problem Statement & Objectives")
    add_body("Problem Statement: Centralized supply chain records lack cross-organizational transparency, cryptographic non-repudiation, and independent consumer auditability, enabling unauthorized record manipulation and counterfeit product penetration.", bold_prefix="Problem Statement: ")

    add_body("Objectives: (1) Assign products a unique on-chain digital identity and Keccak-256 hash; (2) Record custody transitions immutably; (3) Enforce role-based access (Admin, Manufacturer, Distributor, Retailer); (4) Implement two-step escrow transfers (Initiate &rarr; Accept/Reject); (5) Enforce terminal Sold finality; (6) Enable zero-login QR verification; (7) Realize real-time mathematical tamper detection; (8) Index logs into PostgreSQL for sub-15ms queries; (9) Achieve 100% smart contract statement test coverage.")

    add_heading_2("1.4 Technology Stack")
    tech_data = [
        ["Solidity (^0.8.24)", "Smart contract logic", "EVM standard; built-in overflow checks and custom errors."],
        ["Hardhat & Sepolia", "Blockchain development & testnet", "Local EVM node and official Ethereum testnet."],
        ["Next.js 14 & TypeScript", "Full-stack web application", "React Server Components with typed API route handlers."],
        ["PostgreSQL & Prisma", "Relational off-chain database", "ACID compliance, parameterized queries, and fast filtering."],
        ["ethers.js (v6) & SIWE", "Web3 client & wallet authentication", "Transaction signing and EIP-4361 passwordless sessions."],
        ["qrcode & html5-qrcode", "QR generation and scanning", "In-browser video parsing without external hardware."]
    ]
    add_custom_table(["Technology", "Purpose in ChainTrack", "Selection Rationale"], tech_data, [1.4, 2.0, 2.9])

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 5: 2. SYSTEM DESIGN
    # -------------------------------------------------------------
    add_heading_1("2. SYSTEM DESIGN")

    add_heading_2("2.1 Framework / System Architecture")
    add_body("ChainTrack implements a dual-pipeline architecture separating cryptographic proof from descriptive application metadata (Figure 1). Transactions are signed directly via MetaMask (EIP-1193) and broadcast to Ethereum, while off-chain metadata is persisted in PostgreSQL via Prisma. A background indexer daemon polls contract logs, mirrors events, and updates cache snapshots.")

    add_figure("fig1_system_architecture.png", "Figure 1: System architecture of ChainTrack (Dual-Pipeline Architecture)", width_inches=4.7)

    add_heading_2("2.2 Smart Contract / Blockchain Design")
    add_body("SupplyChain.sol manages participants, enforces the product lifecycle state machine (Figure 2), and maintains an append-only audit trail.")

    add_figure("fig2_product_lifecycle.png", "Figure 2: ChainTrack product lifecycle and finite state machine", width_inches=4.7)

    roles_data = [
        ["Admin (0)", "Contract deployer; registers and deactivates participant wallets.", "registerParticipant, setParticipantActive"],
        ["Manufacturer (1)", "Mints products, anchors metadata hashes, initiates transfer.", "registerProduct, initiateTransfer, addLocationUpdate"],
        ["Distributor (2)", "Receives wholesale inventory, logs checkpoints, ships onward.", "acceptTransfer, rejectTransfer, initiateTransfer"],
        ["Retailer (3)", "Receives retail goods, logs store inventory, marks sold.", "acceptTransfer, rejectTransfer, markSold"],
        ["Customer / Public", "Verifies product authenticity and views timeline without login.", "getProduct, getHistory (Public view)"]
    ]
    add_custom_table(["Participant Role", "Operational Responsibilities", "Authorized Functions"], roles_data, [1.3, 2.6, 2.4])

    states_data = [
        ["Created (0)", "Registered by Manufacturer; held at factory floor.", "initiateTransfer &rarr; InTransit (Distributor)"],
        ["InTransit (1)", "Custody transfer initiated; pending receiver acceptance.", "acceptTransfer &rarr; AtDistributor/AtRetailer\nrejectTransfer &rarr; Created/AtDistributor"],
        ["AtDistributor (2)", "Accepted and stocked by an active Distributor.", "initiateTransfer &rarr; InTransit (Retailer)"],
        ["AtRetailer (3)", "Accepted and held in stock by an active Retailer.", "markSold &rarr; Sold (Terminal Finality)"],
        ["Sold (4)", "Sold to end consumer; locked against all further edits.", "None (Permanent finality)"]
    ]
    add_custom_table(["State Enum", "Operational Meaning", "Allowable Next Transitions"], states_data, [1.2, 2.6, 2.5])

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 6: 2.3 REQUIREMENTS & 3.1 IMPLEMENTATION
    # -------------------------------------------------------------
    add_heading_2("2.3 Software & Hardware Requirements")
    env_data = [
        ["Operating System", "Windows 10/11, macOS, or Ubuntu Linux"],
        ["Runtime & Tools", "Node.js v20+ LTS, Solidity v0.8.24, Hardhat, Prisma v5.22"],
        ["Database & Chain", "PostgreSQL 16 (Docker/Native) & Ethereum Sepolia Testnet (11155111)"],
        ["Client & Hardware", "MetaMask Extension; CPU: 4 Cores 2.5 GHz+; RAM: 8 GB+; Disk: 10 GB SSD"]
    ]
    add_custom_table(["Domain", "Specification"], env_data, [1.8, 4.5])

    add_heading_1("3. IMPLEMENTATION AND RESULTS")

    add_heading_2("3.1 System Implementation")
    add_body("ChainTrack is structured into modular frontend pages, REST API handlers, smart contracts, and background daemons. The public portal (Figure 3) enables zero-login search by numeric Product ID or QR scanning. Wallet authentication implements EIP-4361 Sign-In with Ethereum (SIWE): MetaMask signs a unique nonce, the server validates getParticipant() on-chain, and issues an httpOnly JWT session cookie.")

    add_figure("fig5_landing_page.png", "Figure 3: ChainTrack public landing page and instant verification portal", width_inches=4.7)

    add_body("Upon authentication, the user lands on their role-specific dashboard (Figure 4), which aggregates inventory totals (Total Registered, In Transit, At Distributor, Sold) and provides instant status filters.")

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 7: 3.1 IMPLEMENTATION (DASHBOARD & REGISTRATION)
    # -------------------------------------------------------------
    add_figure("fig7_dashboard.png", "Figure 4: Enterprise manufacturer dashboard with inventory metrics", width_inches=4.7)

    add_heading_3("3.1.1 Product Registration & Canonical Hashing")
    add_body("Authorized Manufacturers register products through an intuitive interface (Figure 5). Upon submission, POST /api/products/draft creates a database draft and executes computeProductHash(), recursively sorting JSON keys alphabetically and computing a 32-byte Keccak-256 digest: DataHash = keccak256(CanonicalJSON). The frontend prompts MetaMask to call registerProduct(bytes32, string) on-chain. Once mined, POST /api/products/confirm binds the returned token ID to the confirmed database record.")

    add_figure("fig8_product_registration.png", "Figure 5: Product registration and canonical hash generation interface", width_inches=4.7)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 8: 3.1 IMPLEMENTATION (QR DETAILS & CUSTODY TRANSFER)
    # -------------------------------------------------------------
    add_heading_3("3.1.2 Product Digital Identity & QR Tagging")
    add_body("The product details view (Figure 6) renders the verified serial number, on-chain hash, transaction receipt, and current owner. It dynamically generates a 512x512 PNG QR code encoding the public verification URL ({APP_BASE_URL}/verify/{id}) for direct printing onto physical packaging.")

    add_figure("fig9_product_qr_details.png", "Figure 6: Product digital identity view with QR code generation", width_inches=4.7)

    add_heading_3("3.1.3 Two-Step Custody Handover Protocol")
    add_body("Custody transfer uses a two-step escrow protocol. The current owner executes initiateTransfer() on MetaMask, moving status to IN_TRANSIT. The designated receiver views incoming shipments (Figure 7) and can either accept custody via acceptTransfer() or decline via rejectTransfer() with an on-chain reason, rolling status back to the sender.")

    add_figure("fig11_transfer_acceptance.png", "Figure 7: Inbound custody transfer acceptance and rejection interface", width_inches=4.7)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 9: 3.1 IMPLEMENTATION (PUBLIC VERIFY & TAMPER DETECTION)
    # -------------------------------------------------------------
    add_heading_3("3.1.4 Public Verification & Cryptographic Tamper Detection")
    add_body("Scanning a product QR opens /verify/[id] (Figure 8) without login. The engine reads the on-chain status and hash directly from Ethereum RPC, fetches PostgreSQL metadata, and recalculates the Keccak-256 hash. If matching, an AUTHENTIC green banner is displayed alongside the verified chronological audit timeline.")

    add_figure("fig12_verification_authentic.png", "Figure 8: Public product verification interface displaying AUTHENTIC verdict", width_inches=4.7)

    add_body("If an unauthorized actor alters off-chain database records (e.g., modifying batch numbers), the recalculated hash diverges from the on-chain digest. As shown in Figure 9, the engine instantly detects the discrepancy, displaying a prominent DATA MISMATCH security warning.")

    add_figure("fig13_tamper_detection_mismatch.png", "Figure 9: Simulated metadata tampering resulting in DATA MISMATCH security alert", width_inches=4.7)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 10: 3.2 RESULTS, 3.3 SCOPE, 3.4 COMPARISON
    # -------------------------------------------------------------
    add_heading_2("3.2 Results and Observations")
    add_body("ChainTrack was verified across 87 automated tests: 43 smart contract tests (100% statement, function, and line coverage) and 44 backend integration tests, all passing with zero errors.")

    test_obs = [
        ["Admin Access Control", "Non-admin calls registerParticipant()", "Reverts with NotAdmin()", "Passed (100%)"],
        ["Product Registration", "Manufacturer registers valid hash", "Mints ID #1, emits ProductRegistered", "Passed (100%)"],
        ["Duplicate Hash Guard", "Attempt to register duplicate hash", "Reverts with DuplicateHash()", "Passed (100%)"],
        ["Transfer Handover", "Distributor accepts incoming package", "Ownership transferred, status AtDistributor", "Passed (100%)"],
        ["Transfer Rejection", "Retailer rejects transfer with note", "Ownership unchanged, status AtDistributor", "Passed (100%)"],
        ["Terminal Sale Finality", "Retailer marks sold; write attempted", "Status becomes Sold; write reverts", "Passed (100%)"],
        ["Tamper Detection", "Modify batchNumber in database", "Dynamic hash mismatch flags Warning", "Passed (100%)"],
        ["Zero-Login Verify", "Access /verify/1 without wallet", "Returns complete verified timeline", "Passed (100%)"]
    ]
    add_custom_table(["Test Domain", "Scenario & Input Condition", "Expected Architectural Behavior", "Status"], test_obs, [1.3, 2.3, 2.0, 0.7])

    add_heading_2("3.3 Scope and Limitations")
    add_body("Current limitations include: (1) Operation on Ethereum Sepolia testnet (production requires L2 rollups for low gas fees); (2) Physical oracle gap (standard 2D QR codes can be copied; enterprise requires cryptographic NFC tags); (3) Unresponsive receiver lock (inventory remains in transit if receiver never responds).")

    add_heading_2("3.4 Comparison with Conventional Systems")
    comp_data = [
        ["Record Integrity", "Centralized; database admin can alter or delete rows.", "Cryptographically immutable; anchored on Ethereum."],
        ["Custody Handover", "Manual paper waybills or isolated intra-company ERP logs.", "Deterministic two-step cryptographic escrow."],
        ["Tamper Detection", "Difficult; requires post-incident forensic database auditing.", "Real-time mathematical detection via Keccak-256 comparison."],
        ["Consumer Verification", "Usually impossible or relies on unverified static web pages.", "Zero-login public portal reading directly from RPC."],
        ["Authentication", "Vulnerable username/password databases prone to leaks.", "Passwordless EIP-4361 cryptographic signatures (SIWE)."]
    ]
    add_custom_table(["Dimension", "Conventional Supply Chain Database", "ChainTrack Traceability Platform"], comp_data, [1.3, 2.5, 2.5])

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 11: 4. CONCLUSION, FUTURE WORK & REFERENCES
    # -------------------------------------------------------------
    add_heading_1("4. CONCLUSION")
    add_body("ChainTrack successfully demonstrates a robust, decentralized supply chain traceability platform. By separating immutable cryptographic proof on Ethereum from searchable application metadata in PostgreSQL, ChainTrack proves that blockchain can be deployed for enterprise logistics without sacrificing query performance. The two-step escrow handover enforces non-repudiation, canonical hashing detects database tampering in real time, and the zero-login public portal empowers consumers to verify product provenance effortlessly. With 100% test coverage across 87 automated tests, ChainTrack establishes an audit-ready foundation for trustworthy global supply chains.")

    add_heading_1("FUTURE WORK")
    add_body("Future enhancements include: (1) Layer-2 Rollup Deployment (Arbitrum/Polygon zkEVM) for sub-cent gas fees; (2) ERC-1155 batch minting for high-volume palletized consignments; (3) Automated IoT sensor integration (GPS/temperature) for autonomous transit checkpoints; (4) Zero-knowledge proofs (zk-SNARKs) to verify provenance without exposing commercial wholesale pricing; (5) ERC-1967 transparent upgradeable proxies.")

    add_heading_1("REFERENCES")
    refs = [
        "[1] S. Nakamoto, “Bitcoin: A Peer-to-Peer Electronic Cash System,” 2008.",
        "[2] G. Wood, “Ethereum: A Secure Decentralised Generalised Transaction Ledger,” Ethereum Project Yellow Paper, 2014.",
        "[3] N. Szabo, “Formalizing and Securing Relationships on Public Networks,” First Monday, vol. 2, no. 9, 1997.",
        "[4] E. Androulaki et al., “Hyperledger Fabric: A Distributed Operating System for Permissioned Blockchains,” EuroSys, 2018.",
        "[5] NIST, “Secure Hash Standard (SHS),” FIPS PUB 180-4, U.S. Department of Commerce, 2015.",
        "[6] W. Wayne et al., “EIP-4361: Sign-In with Ethereum,” Ethereum Improvement Proposals, no. 4361, 2022.",
        "[7] Ethereum Foundation, “Solidity Documentation: v0.8.24,” docs.soliditylang.org, 2024.",
        "[8] Nomic Foundation, “Hardhat: Ethereum Development Environment,” hardhat.org, 2024.",
        "[9] R. Moore, “ethers.js: Compact Ethereum Library in TypeScript,” docs.ethers.org, 2024.",
        "[10] Vercel Inc., “Next.js 14 App Router Architecture,” nextjs.org/docs, 2024.",
        "[11] Prisma Data Inc., “Prisma ORM for PostgreSQL,” prisma.io/docs, 2024.",
        "[12] ISO/IEC, “QR Code Bar Code Symbology Specification,” ISO/IEC 18004:2015 Standard, 2015."
    ]
    for r_text in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.10
        r = p.add_run(r_text)
        r.font.size = Pt(8.5)

    doc.save(output_filename)
    print(f"Compact report generated successfully: {output_filename}")

if __name__ == "__main__":
    out_docx = r"D:\Projects\BlockChain\ChainTrack_Project_Report.docx"
    build_compact_report(out_docx)
