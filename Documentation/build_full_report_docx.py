import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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

def build_docx_report(output_filename):
    doc = Document()
    
    # -------------------------------------------------------------
    # SECTION 1: COVER PAGE SETUP (A4, No header/footer)
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

    # Base font setup
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Times New Roman'
    font.size = Pt(11)
    font.color.rgb = RGBColor(15, 23, 42) # Slate black

    # -------------------------------------------------------------
    # COVER PAGE CONTENT
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run("Experiment No. 10")
    r.bold = True
    r.font.size = Pt(12)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run("ChainTrack: A Blockchain-Based Supply Chain Tracker")
    r.bold = True
    r.font.size = Pt(19)
    r.font.color.rgb = RGBColor(23, 59, 87) # Navy

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Submitted in partial fulfillment of the requirements of")
    r.font.size = Pt(11)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Mini Project")
    r.bold = True
    r.font.size = Pt(12)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("in")
    r.font.size = Pt(11)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run("B.E. (Artificial Intelligence and Data Science)")
    r.bold = True
    r.font.size = Pt(12)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run("By")
    r.font.size = Pt(11)

    # Student Table
    t_students = doc.add_table(rows=5, cols=2)
    t_students.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_students, "CBD5E1")
    
    col_widths = [Inches(3.0), Inches(1.8)]
    headers = ["Name", "Roll Number"]
    students = [
        ("[STUDENT NAME 1]", "[ROLL NUMBER 1]"),
        ("[STUDENT NAME 2]", "[ROLL NUMBER 2]"),
        ("[STUDENT NAME 3]", "[ROLL NUMBER 3]"),
        ("[STUDENT NAME 4]", "[ROLL NUMBER 4]")
    ]

    for j, h in enumerate(headers):
        cell = t_students.cell(0, j)
        cell.width = col_widths[j]
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, 80, 80, 120, 120)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(10.5)

    for i, (name, roll) in enumerate(students):
        row = t_students.rows[i+1]
        for j, val in enumerate([name, roll]):
            cell = row.cells[j]
            cell.width = col_widths[j]
            set_cell_margins(cell, 60, 60, 120, 120)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(val)
            r.font.size = Pt(10)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Supervisor:")
    r.font.size = Pt(11)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run("Prof. [PROJECT GUIDE NAME]")
    r.bold = True
    r.font.size = Pt(11.5)

    # Logo
    logo_path = r"D:\Projects\BlockChain\Documentation\report_assets\dmce_logo.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(6)
        p_logo.paragraph_format.space_after = Pt(10)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.1))

    # College Footer Info
    footer_lines = [
        ("Department of Artificial Intelligence and Data Science", True, 13),
        ("DATTA MEGHE COLLEGE OF ENGINEERING, AIROLI,", True, 13),
        ("NAVI MUMBAI – 400 708.", True, 13),
        ("University of Mumbai", True, 13),
        ("(A.Y. 2026–27)", False, 11)
    ]
    for text, bold, sz in footer_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        r.bold = bold
        r.font.size = Pt(sz)

    # -------------------------------------------------------------
    # SECTION 2: REPORT BODY (Headers, Footers, Page Numbers)
    # -------------------------------------------------------------
    sec2 = doc.add_section()
    sec2.page_width = Inches(8.27)
    sec2.page_height = Inches(11.69)
    sec2.top_margin = Inches(1.0)
    sec2.bottom_margin = Inches(0.9)
    sec2.left_margin = Inches(1.0)
    sec2.right_margin = Inches(1.0)

    # Header
    header = sec2.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hr = hp.add_run("Datta Meghe College of Engineering, Airoli")
    hr.font.name = 'Times New Roman'
    hr.font.size = Pt(8.5)
    hr.font.color.rgb = RGBColor(100, 116, 139)

    # Footer
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

    # Helper functions for formatted elements
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(15)
        r.font.color.rgb = RGBColor(23, 59, 87)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(12.5)
        r.font.color.rgb = RGBColor(249, 115, 22)
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_body(text, bold_prefix=None, space_after=6):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.bold = True
        r = p.add_run(text)
        r.font.size = Pt(11)
        return p

    def add_figure(img_filename, caption_text, width_inches=5.8):
        img_path = os.path.join(r"D:\Projects\BlockChain\Documentation\report_assets", img_filename)
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(10)
            p_img.paragraph_format.space_after = Pt(4)
            p_img.add_run().add_picture(img_path, width=Inches(width_inches))
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(12)
            r_cap = p_cap.add_run(caption_text)
            r_cap.italic = True
            r_cap.font.size = Pt(10)
            r_cap.font.color.rgb = RGBColor(71, 85, 105)

    def add_custom_table(headers, rows_data, col_widths, align_center=False):
        table = doc.add_table(rows=len(rows_data)+1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, "CBD5E1")

        # Header Row
        for j, h in enumerate(headers):
            cell = table.cell(0, j)
            cell.width = Inches(col_widths[j])
            set_cell_background(cell, "F1F5F9")
            set_cell_margins(cell, 80, 80, 100, 100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if align_center else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(h)
            r.bold = True
            r.font.size = Pt(10)

        # Data Rows
        for i, row in enumerate(rows_data):
            for j, val in enumerate(row):
                cell = table.cell(i+1, j)
                cell.width = Inches(col_widths[j])
                set_cell_margins(cell, 60, 60, 100, 100)
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (align_center and j == 0) else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(str(val))
                r.font.size = Pt(9.5)
        
        p_sp = doc.add_paragraph()
        p_sp.paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # CERTIFICATE
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(18)
    r = p.add_run("CERTIFICATE")
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(23, 59, 87)

    add_body("This is to certify that the mini project entitled “ChainTrack: A Blockchain-Based Supply Chain Tracker” is a bonafide work carried out by [STUDENT NAME 1], [STUDENT NAME 2], [STUDENT NAME 3], and [STUDENT NAME 4] in partial fulfillment of the requirements for the award of the Degree of Bachelor of Engineering in Artificial Intelligence and Data Science from the University of Mumbai during the academic year 2026–27.")

    add_body("The work presented in this report is an original record of the investigation and implementation carried out by the students under my supervision and guidance, and has not been submitted elsewhere for the award of any other degree or diploma.")

    p_sig = doc.add_paragraph()
    p_sig.paragraph_format.space_before = Pt(45)
    p_sig.paragraph_format.space_after = Pt(4)
    
    # Signature Table
    t_sig = doc.add_table(rows=2, cols=3)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_widths = [Inches(2.2), Inches(2.2), Inches(2.2)]
    sig_data = [
        ("Prof. [PROJECT GUIDE NAME]", "Dr. [HOD NAME]", "Dr. [PRINCIPAL NAME]"),
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
                r.font.size = Pt(10.5)
            else:
                r.font.size = Pt(9.5)

    doc.add_page_break()

    # -------------------------------------------------------------
    # ABSTRACT
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("ABSTRACT")
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(23, 59, 87)

    add_body("Global multi-tier supply chains suffer from severe information fragmentation, opacity, and unauthorized record modification. Because stakeholders—ranging from manufacturers and logistics distributors to commercial retailers—maintain siloed, private relational databases, supply chain records can be silently edited, lost, or disputed. Consequently, counterfeit products enter transit channels undetected, causing over $450 billion in annual economic losses globally and severely endangering public safety in pharmaceutical and luxury sectors.")

    add_body("To address these critical trust and auditability deficits, this project introduces ChainTrack, a full-stack, hybrid Web3 traceability platform. ChainTrack permanently anchors product digital identities, role-based custody transitions, and cryptographic metadata digests on an Ethereum smart contract (SupplyChain.sol) while storing rich, searchable descriptive metadata off-chain in a high-performance PostgreSQL database. User interactions and inventory mutations follow a strict two-step escrow handover protocol (Initiate &rarr; InTransit &rarr; Accept/Reject), preventing unilateral inventory assignment and enforcing non-repudiation.")

    add_body("To eliminate high latency and RPC rate limitations during frontend analytical queries, ChainTrack incorporates an autonomous background event indexer that ingests blockchain event logs, ensures idempotent synchronization using composite transaction keys, and maintains relational state snapshots. For the end consumer, ChainTrack enables instant, zero-login public verification: scanning a physical QR code dynamically recomputes a Keccak-256 hash over canonical database metadata and verifies it against the immutable on-chain proof. Discrepancies immediately trigger a DATA_MISMATCH security alert. Verified across 87 automated tests (43 smart contract and 44 web/API tests) achieving 100% statement coverage, ChainTrack demonstrates a practical, scalable, and tamper-evident architecture for enterprise supply chain integrity.")

    doc.add_page_break()

    # -------------------------------------------------------------
    # LIST OF FIGURES
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("LIST OF FIGURES")
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(23, 59, 87)

    figures_list = [
        ("Figure 1", "System architecture of ChainTrack (Dual-Pipeline Architecture)", "7"),
        ("Figure 2", "ChainTrack product lifecycle and finite state machine", "9"),
        ("Figure 3", "Two-step escrow custody transfer protocol (Initiate &rarr; Accept/Reject)", "10"),
        ("Figure 4", "PostgreSQL database schema and entity relationship diagram (ERD)", "12"),
        ("Figure 5", "ChainTrack public landing page and instant verification search portal", "14"),
        ("Figure 6", "Cryptographic wallet authentication via Sign-In with Ethereum (SIWE)", "15"),
        ("Figure 7", "Enterprise manufacturer dashboard with inventory metrics and filters", "16"),
        ("Figure 8", "Manufacturer product registration interface with Keccak-256 digest creation", "17"),
        ("Figure 9", "Product digital identity view with QR code generation and verification URL", "18"),
        ("Figure 10", "In-transit custody transfer initiation interface", "19"),
        ("Figure 11", "Distributor inbound custody acceptance and rejection interface", "20"),
        ("Figure 12", "Public product verification interface displaying AUTHENTIC verdict and timeline", "21"),
        ("Figure 13", "Simulated off-chain metadata tampering resulting in DATA MISMATCH security warning", "22"),
        ("Figure 14", "Autonomous background indexer daemon synchronization and event log processing", "23")
    ]
    add_custom_table(["Figure No.", "Figure Caption", "Page No."], figures_list, [1.1, 4.4, 0.9], align_center=True)

    doc.add_page_break()

    # -------------------------------------------------------------
    # LIST OF TABLES
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("LIST OF TABLES")
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(23, 59, 87)

    tables_list = [
        ("Table 1", "Technology stack components and selection rationale", "6"),
        ("Table 2", "Participant roles and on-chain permissions in SupplyChain.sol", "8"),
        ("Table 3", "Product lifecycle states and allowable state transitions", "9"),
        ("Table 4", "Core smart contract functions and operational modifiers", "10"),
        ("Table 5", "PostgreSQL database schema models and key attributes", "11"),
        ("Table 6", "Software environment requirements and specifications", "12"),
        ("Table 7", "Hardware infrastructure requirements and recommendations", "13"),
        ("Table 8", "Application software modules and functional responsibilities", "13"),
        ("Table 9", "Automated testing results and verification observations", "24"),
        ("Table 10", "Comparative evaluation between conventional systems and ChainTrack", "26")
    ]
    add_custom_table(["Table No.", "Table Title", "Page No."], tables_list, [1.1, 4.4, 0.9], align_center=True)

    doc.add_page_break()

    # -------------------------------------------------------------
    # CONTENTS (TABLE OF CONTENTS)
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("CONTENTS")
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(23, 59, 87)

    toc_list = [
        ("Certificate", "ii"),
        ("Abstract", "iii"),
        ("List of Figures", "iv"),
        ("List of Tables", "v"),
        ("1. INTRODUCTION", "1"),
        ("   1.1 Introduction", "1"),
        ("   1.2 Literature Survey", "2"),
        ("   1.3 Problem Statement & Objectives", "4"),
        ("   1.4 Technology Stack", "5"),
        ("2. SYSTEM DESIGN", "7"),
        ("   2.1 Framework / System Architecture", "7"),
        ("   2.2 Smart Contract / Blockchain Design", "8"),
        ("   2.3 Database Design & Entity Relationship Model", "11"),
        ("   2.4 Software Requirements", "12"),
        ("   2.5 Hardware Requirements", "13"),
        ("3. IMPLEMENTATION AND RESULTS", "13"),
        ("   3.1 System Implementation", "13"),
        ("       3.1.1 Public Landing Page & Verification Portal", "14"),
        ("       3.1.2 Wallet Authentication & Role-Based Access Control", "15"),
        ("       3.1.3 Role-Specific Dashboards & Inventory Metrics", "16"),
        ("       3.1.4 Product Registration & Canonical Hash Generation", "17"),
        ("       3.1.5 Product Details, QR Code Generation & Display", "18"),
        ("       3.1.6 Two-Step Custody Handover (Initiate, Accept, Reject)", "19"),
        ("       3.1.7 In-Transit Location Checkpoints & Terminal Finality", "20"),
        ("       3.1.8 Public QR Verification & Cryptographic Tamper Detection", "21"),
        ("       3.1.9 Blockchain Event Indexer & State Synchronization", "23"),
        ("   3.2 Results and Observations", "24"),
        ("   3.3 Scope and Limitations", "25"),
        ("   3.4 Comparison with Conventional Systems", "26"),
        ("4. CONCLUSION", "27"),
        ("FUTURE WORK", "28"),
        ("REFERENCES", "29")
    ]
    add_custom_table(["Section / Chapter", "Title", "Page No."], [[item[0], item[0].strip(), item[1]] for item in toc_list], [1.3, 4.2, 0.9])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 1: INTRODUCTION
    # -------------------------------------------------------------
    add_heading_1("1. INTRODUCTION")

    add_heading_2("1.1 Introduction")
    add_body("Modern commercial supply chains represent intricate, multi-tier ecosystems characterized by geographically dispersed participants, complex logistical handovers, and interdependent transactional dependencies. A manufactured good typically traverses multiple administrative domains—beginning at the primary manufacturing plant, passing through regional logistics aggregators and wholesale distributors, stocking at commercial retail establishments, and ultimately reaching the consumer.")

    add_body("Despite the technological modernization of individual enterprise resource planning (ERP) systems, the broader supply chain ecosystem remains severely undermined by data siloing and centralized trust models. Each corporate participant records inventory movements, batch details, and transit timestamps within proprietary, centralized relational databases. Because these centralized records are controlled entirely by the respective database administrator, they lack independent auditability and are inherently vulnerable to retroactive manipulation, unauthorized data modification, insider forgery, and accidental loss.")

    add_body("This structural opacity creates a fertile environment for illicit trade and counterfeit penetration. Illegitimate actors exploit blind spots between inter-organizational handovers to inject substandard or counterfeit products into legitimate distribution channels. In critical sectors such as pharmaceuticals, medical devices, automotive components, and luxury electronics, the inability to verify the authentic provenance and chain of custody of a physical asset poses substantial financial risks and severe hazards to human health and safety.")

    add_body("To address these vulnerabilities, ChainTrack introduces a decentralized, tamper-evident supply chain traceability platform. By separating immutable cryptographic proof from searchable application metadata, ChainTrack anchors every custody handover and lifecycle event onto an Ethereum smart contract while retaining high-speed descriptive queries within PostgreSQL. Furthermore, it empowers consumers to perform zero-login, cryptographic verification via physical QR tags, bridging the gap between enterprise logistics and consumer trust.")

    add_heading_2("1.2 Literature Survey")
    add_body("The academic and industrial foundation of decentralized supply chain management builds upon foundational research in distributed ledger technology, cryptographic hashing standards, and decentralized identity frameworks.")

    add_body("S. Nakamoto (2008) [1] introduced the concept of an immutable, decentralized ledger maintained via cryptographic proof-of-work consensus, establishing that digital transactions could achieve trustless finality without intermediary authorities. G. Wood (2014) [2] expanded this paradigm through the Ethereum Virtual Machine (EVM), introducing a Turing-complete generalized state transition architecture capable of executing autonomous, deterministic logic known as smart contracts. N. Szabo (1997) [3] formalized smart contracts as computerized transaction protocols that execute the terms of a contract automatically, eliminating counterparty risk in multi-party workflows.")

    add_body("In enterprise contexts, E. Androulaki et al. (2018) [4] analyzed permissioned blockchain systems (Hyperledger Fabric), demonstrating that role-based access control and deterministic state execution are critical prerequisites for industrial supply chains involving mutually distrusting organizations. Complementing state machine design, the National Institute of Standards and Technology (NIST FIPS PUB 180-4) [5] formalized secure cryptographic hash standards (SHA-256 and Keccak algorithms), establishing the mathematical properties of collision resistance, preimage resistance, and deterministic avalanche effects necessary for data integrity verification.")

    add_body("Recent academic literature focuses extensively on hybrid on-chain/off-chain storage architectures. Direct on-chain storage of large unstructured files or extensive JSON metadata imposes prohibitive gas costs and degrades blockchain transaction throughput. Consequently, researchers propose hybrid paradigms where cryptographic digests (32-byte hashes) are anchored on-chain while voluminous operational data resides off-chain. Furthermore, the W3C and the Decentralized Identity Foundation formalized EIP-4361 (Sign-In with Ethereum) [6], establishing cryptographic challenge-response protocols using elliptic curve digital signatures (ECDSA) to replace legacy password databases.")

    add_heading_2("1.3 Problem Statement & Objectives")
    add_body("Formal Problem Statement: Traditional supply chain management architectures rely on fragmented, centralized corporate databases that lack cross-organizational transparency, cryptographic non-repudiation, and independent consumer auditability. This architectural trust deficit enables unauthorized record manipulation, facilitates counterfeit product infiltration, causes ownership disputes during transit handovers, and prevents consumers from verifying product authenticity.", bold_prefix="Problem Statement: ")

    add_body("To overcome these limitations, the ChainTrack project establishes the following core engineering objectives:")
    
    objectives = [
        ("1. Digital Identity Provisioning: ", "To assign every manufactured product a cryptographically unique digital identity and canonical Keccak-256 metadata digest anchored permanently on Ethereum."),
        ("2. Immutable Custody Tracking: ", "To record all custody transitions, geographical transit checkpoints, and status updates within an append-only smart contract event history."),
        ("3. Role-Based Cryptographic Access Control: ", "To enforce strict participant authorization (Admin, Manufacturer, Distributor, Retailer) via smart contract modifiers, preventing unauthorized custody manipulation."),
        ("4. Two-Step Escrow Handover Protocol: ", "To implement an explicit initiate-and-accept/reject transfer mechanism, ensuring custody cannot be unilaterally forced upon an unwilling or incorrect recipient."),
        ("5. Terminal Lifecycle Finality: ", "To guarantee that once a product is marked as Sold by an authorized retailer, its state is locked against any further transfer or modification."),
        ("6. Zero-Login Public Verification: ", "To enable end consumers to scan physical QR codes and view complete, verified product histories on any mobile or desktop browser without requiring MetaMask, cryptocurrency, or user accounts."),
        ("7. Cryptographic Tamper Detection: ", "To dynamically recalculate canonical metadata hashes from live database records and compare them with on-chain digests, alerting users to any off-chain database manipulation."),
        ("8. High-Performance Event Indexing: ", "To engineer an autonomous background indexer that mirrors blockchain event logs into PostgreSQL, enabling sub-millisecond query and search performance."),
        ("9. Passwordless Web3 Authentication: ", "To implement EIP-4361 wallet signatures for secure, passwordless authentication issuing stateless JWTs in httpOnly cookies."),
        ("10. Comprehensive Test Verification: ", "To achieve 100% smart contract statement and function coverage with rigorous automated unit and integration testing.")
    ]
    for pfx, desc in objectives:
        add_body(desc, bold_prefix=pfx, space_after=4)

    add_heading_2("1.4 Technology Stack")
    add_body("ChainTrack is built using a modern full-stack TypeScript and Solidity ecosystem, selected specifically to ensure type safety, execution performance, and standards compliance.")

    tech_data = [
        ["Solidity (^0.8.24)", "Smart contract logic", "EVM standard; built-in overflow checks and custom errors."],
        ["Hardhat", "Blockchain development & testing", "TypeScript tooling, local node execution, gas profiling."],
        ["Ethereum Sepolia", "Public test network", "Official PoS testnet mirroring Ethereum mainnet consensus."],
        ["Next.js 14 (App Router)", "Web frontend & API backend", "Unified TypeScript framework combining Server Components with API routes."],
        ["React 18 & TypeScript", "UI components & type safety", "End-to-end type safety spanning contracts, Prisma, and UI."],
        ["Tailwind CSS", "Responsive UI styling", "Utility-first design system with clean visual hierarchy."],
        ["ethers.js (v6)", "Web3 client library", "Lightweight library for transaction signing and Keccak-256 hashing."],
        ["PostgreSQL", "Relational off-chain database", "ACID compliance, parameterized queries, and fast filtering."],
        ["Prisma ORM (v5)", "Database modeling & migrations", "Type-safe database queries and automated schema migrations."],
        ["Zod", "Schema validation", "Strict runtime request validation preventing injection attacks."],
        ["SIWE + jose (JWT)", "Web3 wallet authentication", "EIP-4361 passwordless standard; secure httpOnly cookie sessions."],
        ["qrcode & html5-qrcode", "QR generation & scanning", "In-browser video parsing without external hardware."]
    ]
    add_custom_table(["Technology", "Role in ChainTrack", "Selection Rationale"], tech_data, [1.4, 2.0, 3.0])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 2: SYSTEM DESIGN
    # -------------------------------------------------------------
    add_heading_1("2. SYSTEM DESIGN")

    add_heading_2("2.1 Framework / System Architecture")
    add_body("ChainTrack implements a dual-pipeline hybrid architecture that rigorously separates cryptographic proof from descriptive application metadata. Figure 1 illustrates the interaction between the client browser, the Ethereum smart contract, the Next.js backend, the autonomous background indexer, and the PostgreSQL database.")

    add_figure("fig1_system_architecture.png", "Figure 1: System architecture of ChainTrack (Dual-Pipeline Architecture)")

    add_body("The architecture operates via three complementary execution pipelines:")
    add_body("1. On-Chain Transaction Pipeline: Authenticated supply chain participants (Manufacturers, Distributors, Retailers) interact directly with their MetaMask browser extension (EIP-1193). State-changing transactions—such as product registration, transfer initiation, acceptance, and sale—are signed client-side with the user's private key and broadcast directly to the Ethereum Virtual Machine. The backend server never possesses or manages user private keys, establishing non-repudiation.", bold_prefix="On-Chain Pipeline: ")

    add_body("2. Off-Chain Application Pipeline: The Next.js backend exposes RESTful API routes validated by Zod schemas. Descriptive product attributes, high-resolution media URLs, participant organization profiles, and draft states are persisted in PostgreSQL via Prisma ORM. This tier powers high-speed dashboard aggregation and full-text search.", bold_prefix="Off-Chain Pipeline: ")

    add_body("3. Background Indexing & Verification Pipeline: An autonomous background daemon (indexer.ts) continuously polls the blockchain for emitted contract events. It processes logs in chunked windows, deduplicates records using composite database keys (txHash + logIndex), updates relational cache tables, and captures on-chain state snapshots. The public verification portal (/verify/[id]) reads state directly from RPC and compares live database metadata against the on-chain Keccak-256 digest to detect tampering.", bold_prefix="Indexing Pipeline: ")

    add_heading_2("2.2 Smart Contract / Blockchain Design")
    add_body("The on-chain core is encapsulated in a single, self-contained Solidity contract: SupplyChain.sol. It manages participant authorization, enforces the product state machine, maintains append-only custody histories, and prevents hash collisions.")

    roles_data = [
        ["Admin (0)", "Contract deployer; registers and deactivates participant wallets.", "registerParticipant, setParticipantActive"],
        ["Manufacturer (1)", "Creates product tokens and initiates initial outbound transit.", "registerProduct, initiateTransfer, addLocationUpdate"],
        ["Distributor (2)", "Receives wholesale inventory, logs checkpoints, ships onward.", "acceptTransfer, rejectTransfer, initiateTransfer, addLocationUpdate"],
        ["Retailer (3)", "Receives retail goods, logs store inventory, marks sold.", "acceptTransfer, rejectTransfer, markSold, addLocationUpdate"],
        ["Customer / Public", "Verifies product authenticity and views timeline without login.", "getProduct, getHistory, exists (View functions)"]
    ]
    add_custom_table(["Participant Role", "Functional Responsibilities", "Authorized Functions"], roles_data, [1.3, 2.7, 2.4])

    add_body("Figure 2 illustrates the product lifecycle state machine and allowable status transitions.")
    add_figure("fig2_product_lifecycle.png", "Figure 2: ChainTrack product lifecycle and finite state machine")

    add_body("The state machine strictly enforces sequential ownership order. A product cannot skip intermediate stages (e.g., direct Manufacturer to Retailer transfers are prohibited).")

    states_data = [
        ["Created (0)", "Registered by Manufacturer; held at manufacturing facility.", "initiateTransfer &rarr; InTransit (to Distributor)"],
        ["InTransit (1)", "Custody transfer initiated; pending receiver acceptance.", "acceptTransfer &rarr; AtDistributor/AtRetailer\nrejectTransfer &rarr; Created/AtDistributor"],
        ["AtDistributor (2)", "Accepted and held in inventory by an active Distributor.", "initiateTransfer &rarr; InTransit (to Retailer)\naddLocationUpdate &rarr; AtDistributor"],
        ["AtRetailer (3)", "Accepted and held in stock by an active Retailer.", "markSold &rarr; Sold\naddLocationUpdate &rarr; AtRetailer"],
        ["Sold (4)", "Sold to end consumer; terminal state locked against all edits.", "None (Permanent finality)"]
    ]
    add_custom_table(["State Enum", "Operational Meaning", "Allowable Next Transitions"], states_data, [1.2, 2.6, 2.6])

    add_body("Figure 3 details the two-step escrow custody transfer protocol, ensuring that inventory cannot be unilaterally assigned without physical inspection and cryptographic acceptance by the recipient.")
    add_figure("fig3_custody_transfer_protocol.png", "Figure 3: Two-step escrow custody transfer protocol (Initiate &rarr; Accept/Reject)")

    sc_funcs = [
        ["registerParticipant(wallet, role)", "Admin", "onlyAdmin", "Registers an active participant with an assigned Role."],
        ["setParticipantActive(wallet, active)", "Admin", "onlyAdmin", "Toggles active flag; deactivated wallets cannot execute writes."],
        ["registerProduct(dataHash, location)", "Manufacturer", "onlyActiveParticipant", "Mints next product ID, anchors Keccak-256 hash, logs Created."],
        ["initiateTransfer(id, to, loc, note)", "Owner", "onlyOwnerOf, whenExists", "Sets pendingReceiver, advances status to InTransit."],
        ["acceptTransfer(id, location)", "Receiver", "onlyActiveParticipant", "Transfers ownership to caller, sets status by receiver role."],
        ["rejectTransfer(id, reason)", "Receiver", "whenExists", "Reverts status back to previous stage; owner unchanged."],
        ["addLocationUpdate(id, loc, note)", "Owner", "onlyOwnerOf, whenExists", "Appends checkpoint entry to on-chain history array."],
        ["markSold(id, location)", "Retailer", "onlyOwnerOf, whenExists", "Locks product in terminal Sold state; blocks future writes."]
    ]
    add_custom_table(["Function Signature", "Caller", "Modifiers", "State Modification & Operational Effect"], sc_funcs, [1.8, 0.9, 1.1, 2.6])

    add_heading_2("2.3 Database Design & Entity Relationship Model")
    add_body("PostgreSQL serves as the off-chain operational data store, managed through Prisma ORM. Figure 4 depicts the entity relationship diagram (ERD) defining participant profiles, product metadata, indexed events, authentication nonces, and indexer state cursors.")

    add_figure("fig4_database_schema_erd.png", "Figure 4: PostgreSQL database schema and entity relationship diagram (ERD)")

    add_body("Table 5 outlines the primary Prisma schema models, field data types, constraints, and operational purposes.")

    db_models = [
        ["Participant", "id (PK), walletAddress (UK, lowercase), role (Enum), isActive (Bool), organizationName, contactEmail, location", "Stores off-chain corporate profile data and mirrors on-chain role status."],
        ["Product", "id (PK, draftId), chainProductId (UK, Int?), serialNumber (UK), dataHash (UK, bytes32), name, category, batchNumber, manufacturingDate, currentOwner, currentStatus, isConfirmed", "Maintains descriptive product specifications, draft states, and relational cache mirrors."],
        ["ProductEvent", "id (PK), chainProductId (Int), eventType (Enum), actor, counterparty, location, note, blockNumber, txHash, logIndex", "Mirrors on-chain event logs; enforced by unique constraint @@unique([txHash, logIndex])."],
        ["AuthNonce", "id (PK), address (lowercase), nonce (UK), expiresAt (DateTime), usedAt (DateTime?)", "Manages single-use cryptographic nonces for SIWE challenge-response authentication."],
        ["IndexerState", "id (PK, 'main'), lastProcessedBlock (Int), updatedAt (DateTime)", "Tracks the atomic block cursor to ensure fault-tolerant indexer restart recovery."]
    ]
    add_custom_table(["Model / Entity", "Key Fields & Constraints", "Architectural Role & Description"], db_models, [1.1, 2.7, 2.6])

    add_body("Canonical JSON Specification: To guarantee that metadata hashing is deterministic across different operating systems and runtime environments, ChainTrack implements a strict serialization algorithm (hash.ts). Object keys are recursively sorted in alphabetical order, date fields are formatted to ISO YYYY-MM-DD strings, wallet addresses are lowercased, and extraneous whitespace is removed before computing the Keccak-256 digest: DataHash = keccak256(utf8Bytes(CanonicalJSON)).", bold_prefix="Canonical Hashing: ")

    add_heading_2("2.4 Software Requirements")
    add_body("The software development and execution environment is summarized in Table 6.")

    sw_reqs = [
        ["Operating System", "Windows 10/11, macOS Sonoma/Sequoia, or Ubuntu Linux 22.04 LTS"],
        ["Runtime Environment", "Node.js v20.14.0+ LTS and npm v10.0+"],
        ["Smart Contract Compiler", "Solidity Compiler solc v0.8.24 (via Hardhat v2.22+)"],
        ["Blockchain Networks", "Localhost Hardhat EVM (Chain ID 31337) & Ethereum Sepolia Testnet (11155111)"],
        ["Relational Database", "PostgreSQL 16 (via Docker Compose container or native instance)"],
        ["Database ORM", "Prisma Client & Prisma CLI v5.22.0"],
        ["Web Framework", "Next.js v14.2.23 (React 18.3.1, TypeScript 5.4.5, Tailwind CSS 3.4.17)"],
        ["Web3 Client & Wallet", "ethers.js v6.13.4 and MetaMask Browser Extension (Chrome/Edge/Firefox)"],
        ["Testing Frameworks", "Hardhat/Chai (Contract unit tests) and tsx/Node Test Runner (API/Services)"]
    ]
    add_custom_table(["Requirement Domain", "Specification & Version"], sw_reqs, [2.0, 4.4])

    add_heading_2("2.5 Hardware Requirements")
    add_body("Due to the lightweight nature of local EVM simulation and modern web runtimes, hardware requirements are accessible across standard developer workstations:")

    hw_reqs = [
        ["Central Processing Unit (CPU)", "Intel Core i5 / AMD Ryzen 5 (4 cores, 2.5 GHz or higher)."],
        ["System Memory (RAM)", "Minimum: 8 GB RAM; Recommended: 16 GB RAM for Docker and EVM compilation."],
        ["Secondary Storage", "Minimum: 10 GB free SSD space for node_modules, Docker images, and local chain state."],
        ["Network Interface", "Standard broadband Internet connection for Sepolia RPC communication (2 Mbps+)."]
    ]
    add_custom_table(["Hardware Component", "Minimum & Recommended Specifications"], hw_reqs, [2.0, 4.4])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 3: IMPLEMENTATION AND RESULTS
    # -------------------------------------------------------------
    add_heading_1("3. IMPLEMENTATION AND RESULTS")

    add_heading_2("3.1 System Implementation")
    add_body("ChainTrack is structured into 12 functional software modules spanning frontend user interfaces, backend API routes, smart contracts, and asynchronous background daemons, as detailed in Table 8.")

    app_modules = [
        ["1. Public Verification Portal", "Public (/)", "Enables zero-login search by ID and mobile QR camera scanning."],
        ["2. Wallet Authentication", "Public (/login)", "Implements EIP-4361 SIWE challenge-response and issues secure JWT cookies."],
        ["3. Admin Participant Registry", "Admin (/admin/*)", "Authorizes on-chain participant registration and toggles active status."],
        ["4. Product Registration", "Manufacturer (/products/new)", "Generates draft metadata, computes canonical Keccak-256 hash, prompts tx."],
        ["5. Product Inventory View", "All Roles (/products)", "Displays searchable, role-scoped inventory grids with status filters."],
        ["6. Product Identity & QR", "All Roles (/products/[id])", "Renders product specifications, live owner status, and downloadable QR PNG."],
        ["7. Custody Transfer Initiation", "Owner (/products/[id])", "Selects validated recipient role and executes initiateTransfer on-chain."],
        ["8. Transfer Acceptance/Rejection", "Receiver (/transfers)", "Inspects pending inbound inventory and executes accept or reject on-chain."],
        ["9. In-Transit Checkpoints", "Owner (/products/[id])", "Appends environmental and transit location notes to on-chain history."],
        ["10. Retail Final Sale", "Retailer (/products/[id])", "Executes markSold(), permanently locking product against future edits."],
        ["11. Public Verification View", "Public (/verify/[id])", "Fetches on-chain proof, re-hashes database record, renders verdict & timeline."],
        ["12. Background Event Indexer", "Daemon (indexer-daemon.ts)", "Polls contract logs, maintains block cursor, updates PostgreSQL cache."]
    ]
    add_custom_table(["Module Name", "Route / Target", "Functional Scope & Implementation Description"], app_modules, [1.5, 1.4, 3.5])

    # 3.1.1 Public Landing
    add_heading_3("3.1.1 Public Landing Page & Verification Portal")
    add_body("The landing page (Figure 5) serves as the primary entry point for consumers and enterprise users. It features an instant verification search bar where users can input numeric Product IDs or UUID serial numbers. Additionally, it integrates a camera-based QR scanner (QrScannerModal.tsx) powered by html5-qrcode, allowing consumers to scan physical packaging directly from mobile or desktop webcams without downloading third-party applications.")
    add_figure("fig5_landing_page.png", "Figure 5: ChainTrack public landing page and instant verification search portal")

    # 3.1.2 Wallet Auth
    add_heading_3("3.1.2 Wallet Authentication & Role-Based Access Control")
    add_body("Authentication (Figure 6) follows the EIP-4361 Sign-In with Ethereum standard. When a user connects MetaMask, the frontend requests a cryptographic nonce via GET /api/auth/nonce. The user signs an EIP-4361 compliant message containing the domain, nonce, and expiration. The backend verifies the signature using ethers.verifyMessage, queries getParticipant() on the smart contract to retrieve the assigned role, and issues a stateless JSON Web Token (JWT) sealed inside an httpOnly, Secure, SameSite=Lax cookie.")
    add_figure("fig6_wallet_auth.png", "Figure 6: Cryptographic wallet authentication via Sign-In with Ethereum (SIWE)")

    # 3.1.3 Dashboard
    add_heading_3("3.1.3 Role-Specific Dashboards & Inventory Metrics")
    add_body("Upon successful authentication, users are redirected to their role-tailored dashboard (Figure 7). The dashboard aggregates key lifecycle metrics (Total Registered, In Transit, At Distributor, Sold) using optimized PostgreSQL queries. Role-based middleware ensures that Manufacturers view created inventory, Distributors and Retailers view currently owned and incoming stock, and Admins monitor network-wide activity.")
    add_figure("fig7_dashboard.png", "Figure 7: Enterprise manufacturer dashboard with inventory metrics and filters")

    # 3.1.4 Product Registration
    add_heading_3("3.1.4 Product Registration & Canonical Hash Generation")
    add_body("Authorized Manufacturers register physical products through an intuitive interface (Figure 8). Upon form submission, POST /api/products/draft creates an unconfirmed database draft and executes computeProductHash(), producing a deterministic 32-byte Keccak-256 digest. The frontend then prompts MetaMask to execute registerProduct(bytes32, string) on SupplyChain.sol. Once mined, POST /api/products/confirm binds the returned on-chain token ID to the draft record.")
    add_figure("fig8_product_registration.png", "Figure 8: Manufacturer product registration interface with Keccak-256 digest creation")

    # 3.1.5 Product Details & QR
    add_heading_3("3.1.5 Product Details, QR Code Generation & Display")
    add_body("The product details view (Figure 9) provides a complete operational summary, displaying serial numbers, on-chain transaction hashes, manufacturing timestamps, and current ownership status. The system dynamically generates a 512x512 PNG QR code (qrcode library) encoding the public verification URL ({APP_BASE_URL}/verify/{productId}), which manufacturers can download or print directly onto packaging.")
    add_figure("fig9_product_qr_details.png", "Figure 9: Product digital identity view with QR code generation and verification URL")

    # 3.1.6 Custody Transfer
    add_heading_3("3.1.6 Two-Step Custody Handover (Initiate, Accept, Reject)")
    add_body("Custody transfer utilizes a two-step escrow protocol. In Figure 10, the current owner initiates transfer by selecting an active recipient of the correct next role, logging a dispatch location, and signing initiateTransfer() on MetaMask, shifting status to IN_TRANSIT. In Figure 11, the recipient inspects pending incoming consignments; they can either claim ownership via acceptTransfer() or decline custody via rejectTransfer() with an on-chain reason, returning the product to the sender.")
    add_figure("fig10_transfer_initiation.png", "Figure 10: In-transit custody transfer initiation interface")
    add_figure("fig11_transfer_acceptance.png", "Figure 11: Distributor inbound custody acceptance and rejection interface")

    # 3.1.7 In-Transit Checkpoints & Sold
    add_heading_3("3.1.7 In-Transit Location Checkpoints & Terminal Finality")
    add_body("While holding custody, active owners can invoke addLocationUpdate() to log intermediate environmental readings (e.g., cold-chain temperature verification) and logistical waypoints without altering ownership. Once goods reach retail purchase, the Retailer invokes markSold(). The smart contract advances status to SOLD, permanently disabling any further state transitions or updates.")

    # 3.1.8 Public Verification & Tamper Detection
    add_heading_3("3.1.8 Public QR Verification & Cryptographic Tamper Detection")
    add_body("When a consumer scans a product QR code, the public route /verify/[id] (Figure 12) executes an independent audit. The backend fetches the on-chain status and Keccak-256 hash directly from Ethereum RPC, retrieves off-chain metadata from PostgreSQL, and dynamically recalculates the hash over current database fields. If identical, an AUTHENTIC green verdict is displayed alongside a verified chronological event timeline.")
    add_figure("fig12_verification_authentic.png", "Figure 12: Public product verification interface displaying AUTHENTIC verdict and timeline")

    add_body("If an unauthorized actor manipulates off-chain database records (e.g., editing batch numbers or manufacturing dates), the recomputed hash diverges from the immutable on-chain digest. As shown in Figure 13, the verification engine immediately detects the mathematical discrepancy, rendering a prominent DATA MISMATCH security warning to protect the consumer.")
    add_figure("fig13_tamper_detection_mismatch.png", "Figure 13: Simulated off-chain metadata tampering resulting in DATA MISMATCH security warning")

    # 3.1.9 Indexer
    add_heading_3("3.1.9 Blockchain Event Indexer & State Synchronization")
    add_body("The autonomous event indexer (Figure 14) runs as a background Node.js process (src/indexer-daemon.ts). It scans newly mined blocks using an atomic block cursor (IndexerState), deduplicates logs via composite database keys (txHash + logIndex), and updates PostgreSQL snapshot columns. On public testnets, it enforces a 2-block confirmation depth to guard against temporary chain reorganizations.")
    add_figure("fig14_indexer_daemon_log.png", "Figure 14: Autonomous background indexer daemon synchronization and event log processing")

    add_heading_2("3.2 Results and Observations")
    add_body("The ChainTrack platform underwent rigorous automated testing across contract, API, and end-to-end integration layers. The test suite comprises 87 automated tests: 43 smart contract unit tests executed via Hardhat/Chai and 44 backend integration tests executed via tsx test runners. All 87 tests passed with zero failures and 100% statement/function coverage.")

    test_obs = [
        ["Admin Access Control", "Non-admin wallet calls registerParticipant()", "Revert with custom error NotAdmin()", "Passed (100%)"],
        ["Product Registration", "Manufacturer registers new product with valid hash", "Mints ID #1, emits ProductRegistered, status Created", "Passed (100%)"],
        ["Duplicate Hash Guard", "Manufacturer attempts to register duplicate hash", "Revert with custom error DuplicateHash()", "Passed (100%)"],
        ["Unauthorized Transfer", "Non-owner attempts to call initiateTransfer()", "Revert with custom error NotOwner()", "Passed (100%)"],
        ["Invalid Role Transition", "Manufacturer attempts direct transfer to Retailer", "Revert with custom error InvalidReceiver()", "Passed (100%)"],
        ["Transfer Acceptance", "Designated Distributor accepts pending transfer", "Ownership transferred, status updated to AtDistributor", "Passed (100%)"],
        ["Transfer Rejection", "Designated Retailer rejects transfer with note", "Ownership unchanged, status reverts to AtDistributor", "Passed (100%)"],
        ["Terminal Sale Finality", "Retailer marks sold; subsequent write attempted", "Product status becomes Sold; subsequent write reverts", "Passed (100%)"],
        ["Canonical Hashing", "Compute hash with scrambled JSON key order", "Identical Keccak-256 byte digest generated", "Passed (100%)"],
        ["Tamper Detection", "Modify batchNumber directly in PostgreSQL database", "Verification engine detects mismatch & flags warning", "Passed (100%)"],
        ["Indexer Recovery", "Restart indexer after simulated network shutdown", "Resumes from lastProcessedBlock without duplicate logs", "Passed (100%)"],
        ["Zero-Login Verify", "Access /verify/1 without connected wallet/token", "Returns complete on-chain history and AUTHENTIC verdict", "Passed (100%)"]
    ]
    add_custom_table(["Test Case Domain", "Test Scenario & Input Condition", "Expected Architectural Behavior", "Execution Status"], test_obs, [1.3, 2.3, 2.1, 0.7])

    add_heading_2("3.3 Scope and Limitations")
    add_body("While ChainTrack provides a robust, tamper-evident traceability framework, several operational limitations are acknowledged based on the project's current MVP scope:")
    
    limits = [
        ("1. Public Testnet Deployment: ", "The current deployment operates on Ethereum Sepolia and local Hardhat testnets. Deployment to Ethereum Mainnet would incur variable gas fees requiring Layer-2 scaling solutions (e.g., Arbitrum or Optimism)."),
        ("2. Physical Oracle Problem: ", "The system binds digital tokens to physical assets via standard 2D QR codes. While mathematically secure digitally, physical QR tags can be photocopied; enterprise production requires cryptographic NFC chips or tamper-evident holographic seals."),
        ("3. Unresponsive Receiver Lock: ", "If a designated receiver becomes permanently inactive or loses wallet access while a product is InTransit, inventory remains locked in transit (identified as a future extension for sender cancellation timeouts)."),
        ("4. IoT Automation: ", "Environmental checkpoints (e.g., temperature) are logged via authenticated transactions; automated telemetry requires IoT hardware gateway integration.")
    ]
    for pfx, desc in limits:
        add_body(desc, bold_prefix=pfx, space_after=4)

    add_heading_2("3.4 Comparison with Conventional Systems")
    add_body("Table 10 provides a comprehensive comparative analysis between conventional supply chain database systems and ChainTrack.")

    comp_data = [
        ["Record Integrity", "Centralized; database administrator can alter or delete rows silently.", "Cryptographically immutable; anchored on Ethereum smart contract."],
        ["Custody Verification", "Manual paper waybills or isolated intra-company ERP logs.", "Deterministic two-step cryptographic escrow (Initiate &rarr; Accept)."],
        ["Tamper Detection", "Difficult; requires post-incident forensic database auditing.", "Real-time mathematical detection via dynamic Keccak-256 hash comparison."],
        ["Trust & Governance", "Single entity controls server, access rules, and database backups.", "Decentralized consensus; smart contract rules govern all participants."],
        ["Consumer Verification", "Usually impossible or relies on unverified static web pages.", "Zero-login public portal reading directly from blockchain RPC."],
        ["Authentication Model", "Vulnerable username/password databases prone to credential leaks.", "Passwordless EIP-4361 cryptographic signatures (SIWE)."],
        ["Query Performance", "Fast relational queries but zero decentralized trust.", "Hybrid model: Sub-15ms SQL queries with on-chain cryptographic proofs."],
        ["Terminal Finality", "Records can be reopened, edited, or purged indefinitely.", "Sold status permanently locks asset against all future mutations."]
    ]
    add_custom_table(["Architectural Dimension", "Conventional Supply Chain Database", "ChainTrack Traceability Platform"], comp_data, [1.3, 2.5, 2.6])

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 4: CONCLUSION
    # -------------------------------------------------------------
    add_heading_1("4. CONCLUSION")
    add_body("The ChainTrack project successfully conceptualizes, engineers, and validates an end-to-end decentralized supply chain traceability platform addressing the critical challenges of data fragmentation, unauthorized record modification, and counterfeit product infiltration. By adopting a hybrid architecture that synergizes Ethereum smart contracts with PostgreSQL relational caching, ChainTrack demonstrates that blockchain technology can be deployed for enterprise logistics without sacrificing query responsiveness or incurring prohibitive operational costs.")

    add_body("The smart contract (SupplyChain.sol) establishes an unalterable single source of truth for participant permissions, ownership transitions, and lifecycle event histories. The implementation of a two-step escrow transfer mechanism eliminates unilateral inventory assignment, ensuring that every physical handover is cryptographically signed and non-repudiable. Furthermore, the canonical metadata hashing engine successfully bridges off-chain descriptive richness with on-chain immutability, enabling instant mathematical tamper detection upon any unauthorized database modification.")

    add_body("For the broader public and end consumers, ChainTrack removes the traditional friction associated with Web3 applications by providing a zero-login verification portal accessible via standard QR codes on any mobile device. Through comprehensive automated testing achieving 100% smart contract statement coverage across 87 unit and integration tests, ChainTrack proves that decentralized ledgers provide a viable, robust, and scalable foundation for trustworthy global trade.")

    # -------------------------------------------------------------
    # FUTURE WORK
    # -------------------------------------------------------------
    add_heading_1("FUTURE WORK")
    add_body("Future enhancements planned for ChainTrack include:")
    
    fw_items = [
        ("1. Layer-2 Rollup Deployment: ", "Deploying smart contract logic to Ethereum Layer-2 optimistic or zero-knowledge rollups (e.g., Arbitrum One, Polygon zkEVM) to achieve sub-cent gas fees and throughput exceeding 2,000 transactions per second."),
        ("2. Batch Minting & Mass Transfers: ", "Implementing ERC-1155 multi-token standards to support high-volume palletized batch registration and multi-unit consignment transfers in a single transaction."),
        ("3. Automated IoT Telemetry Integration: ", "Integrating GPS and temperature IoT sensors equipped with hardware secure elements to autonomously trigger checkpoint events and automated breach flags on-chain."),
        ("4. Zero-Knowledge Confidentiality: ", "Implementing zk-SNARKs to allow enterprise participants to verify authentic provenance and regulatory compliance without exposing sensitive wholesale pricing or proprietary supplier networks."),
        ("5. Upgradeable Proxy Contracts: ", "Refactoring smart contracts using the ERC-1967 Transparent Proxy pattern to enable business logic upgrades while preserving immutable historical state storage.")
    ]
    for pfx, desc in fw_items:
        add_body(desc, bold_prefix=pfx, space_after=4)

    # -------------------------------------------------------------
    # REFERENCES
    # -------------------------------------------------------------
    add_heading_1("REFERENCES")
    
    refs = [
        "[1] S. Nakamoto, “Bitcoin: A Peer-to-Peer Electronic Cash System,” Decentralized Business Review, p. 21260, 2008.",
        "[2] G. Wood, “Ethereum: A Secure Decentralised Generalised Transaction Ledger,” Ethereum Project Yellow Paper, vol. 151, pp. 1–32, 2014.",
        "[3] N. Szabo, “Formalizing and Securing Relationships on Public Networks,” First Monday, vol. 2, no. 9, 1997.",
        "[4] E. Androulaki et al., “Hyperledger Fabric: A Distributed Operating System for Permissioned Blockchains,” in Proceedings of the Thirteenth EuroSys Conference, 2018, pp. 1–15.",
        "[5] National Institute of Standards and Technology (NIST), “Secure Hash Standard (SHS),” Federal Information Processing Standards Publication (FIPS PUB 180-4), U.S. Department of Commerce, 2015.",
        "[6] W. Wayne, R. Moore, et al., “EIP-4361: Sign-In with Ethereum,” Ethereum Improvement Proposals, no. 4361, Jan. 2022.",
        "[7] Ethereum Foundation, “Solidity Documentation: v0.8.24 Release Specification,” docs.soliditylang.org, 2024.",
        "[8] Nomic Foundation, “Hardhat: Ethereum Development Environment for Professionals,” hardhat.org, 2024.",
        "[9] R. Moore, “ethers.js: Complete, Compact, and Simple Ethereum Library in TypeScript,” docs.ethers.org, 2024.",
        "[10] Vercel Inc., “Next.js 14 App Router Architecture and Server Components Documentation,” nextjs.org/docs, 2024.",
        "[11] Prisma Data Inc., “Prisma ORM: Next-Generation Node.js and TypeScript ORM for PostgreSQL,” prisma.io/docs, 2024.",
        "[12] ISO/IEC, “Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification,” ISO/IEC 18004:2015 Standard, 2015."
    ]
    for r_text in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(r_text)
        r.font.size = Pt(10)

    # Save document
    doc.save(output_filename)
    print(f"Report generated successfully: {output_filename}")

if __name__ == "__main__":
    out_docx = r"D:\Projects\BlockChain\ChainTrack_Project_Report.docx"
    build_docx_report(out_docx)
