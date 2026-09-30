// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SupplyChain
 * @notice Immutable source of truth for the ChainTrack supply chain tracking system.
 * Handles participant registration, product lifecycle transitions, custody transfers,
 * tamper-evident history logging, and data hash integrity.
 */
contract SupplyChain {
    // ---------- Types ----------
    enum Role {
        None,
        Manufacturer,
        Distributor,
        Retailer
    }

    enum Status {
        Created,
        InTransit,
        AtDistributor,
        AtRetailer,
        Sold
    }

    enum EventType {
        Registered,
        TransferInitiated,
        TransferAccepted,
        TransferRejected,
        LocationUpdate,
        Sold
    }

    struct Participant {
        Role role;
        bool active;
    }

    struct Product {
        uint256 id;
        bytes32 dataHash;
        address manufacturer;
        address currentOwner;
        address pendingReceiver;
        Status status;
        uint64 createdAt;
    }

    struct HistoryEntry {
        EventType eventType;
        address actor;
        address counterparty;
        uint64 timestamp;
        string location;
        string note;
    }

    // ---------- Constants ----------
    uint256 public constant MAX_LOCATION_LENGTH = 100;
    uint256 public constant MAX_NOTE_LENGTH = 280;

    // ---------- Storage ----------
    address public immutable admin;
    uint256 public productCount;

    mapping(address => Participant) private participants;
    mapping(uint256 => Product) private products;
    mapping(uint256 => HistoryEntry[]) private histories;
    mapping(bytes32 => bool) private hashUsed;

    // ---------- Custom Errors ----------
    error NotAdmin();
    error NotParticipant();
    error ParticipantInactive();
    error WrongRole();
    error AlreadyRegistered();
    error InvalidRole();
    error ZeroAddress();
    error ProductNotFound();
    error NotOwner();
    error NotPendingReceiver();
    error InvalidStatus();
    error InvalidReceiver();
    error EmptyHash();
    error DuplicateHash();
    error StringTooLong();

    // ---------- Events ----------
    event ParticipantRegistered(address indexed wallet, Role role);
    event ParticipantStatusChanged(address indexed wallet, bool active);
    event ProductRegistered(
        uint256 indexed productId,
        address indexed manufacturer,
        bytes32 dataHash,
        string location
    );
    event TransferInitiated(
        uint256 indexed productId,
        address indexed from,
        address indexed to,
        string location,
        string note
    );
    event TransferAccepted(
        uint256 indexed productId,
        address indexed by,
        string location
    );
    event TransferRejected(
        uint256 indexed productId,
        address indexed by,
        string reason
    );
    event LocationUpdated(
        uint256 indexed productId,
        address indexed by,
        string location,
        string note
    );
    event ProductSold(
        uint256 indexed productId,
        address indexed by,
        string location
    );

    // ---------- Modifiers ----------
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyActiveParticipant() {
        Participant memory p = participants[msg.sender];
        if (p.role == Role.None) revert NotParticipant();
        if (!p.active) revert ParticipantInactive();
        _;
    }

    modifier whenExists(uint256 id) {
        if (id == 0 || id > productCount) revert ProductNotFound();
        _;
    }

    modifier onlyOwnerOf(uint256 id) {
        if (products[id].currentOwner != msg.sender) revert NotOwner();
        _;
    }

    // ---------- Constructor ----------
    constructor() {
        admin = msg.sender;
    }

    // ---------- Admin Functions ----------
    function registerParticipant(address wallet, Role role) external onlyAdmin {
        if (wallet == address(0)) revert ZeroAddress();
        if (role == Role.None) revert InvalidRole();
        if (participants[wallet].role != Role.None) revert AlreadyRegistered();

        participants[wallet] = Participant(role, true);
        emit ParticipantRegistered(wallet, role);
    }

    function setParticipantActive(address wallet, bool active) external onlyAdmin {
        if (participants[wallet].role == Role.None) revert NotParticipant();

        participants[wallet].active = active;
        emit ParticipantStatusChanged(wallet, active);
    }

    // ---------- Manufacturer Functions ----------
    function registerProduct(bytes32 dataHash, string calldata location)
        external
        onlyActiveParticipant
        returns (uint256 id)
    {
        if (participants[msg.sender].role != Role.Manufacturer) revert WrongRole();
        if (dataHash == bytes32(0)) revert EmptyHash();
        if (hashUsed[dataHash]) revert DuplicateHash();
        _checkLen(location, MAX_LOCATION_LENGTH);

        hashUsed[dataHash] = true;
        id = ++productCount;
        products[id] = Product({
            id: id,
            dataHash: dataHash,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            pendingReceiver: address(0),
            status: Status.Created,
            createdAt: uint64(block.timestamp)
        });

        _log(id, EventType.Registered, msg.sender, address(0), location, "");
        emit ProductRegistered(id, msg.sender, dataHash, location);
    }

    // ---------- Transfer Functions ----------
    function initiateTransfer(
        uint256 id,
        address to,
        string calldata location,
        string calldata note
    ) external onlyActiveParticipant whenExists(id) onlyOwnerOf(id) {
        Product storage p = products[id];

        Role receiverRole;
        if (p.status == Status.Created) {
            receiverRole = Role.Distributor;
        } else if (p.status == Status.AtDistributor) {
            receiverRole = Role.Retailer;
        } else {
            revert InvalidStatus();
        }

        Participant memory r = participants[to];
        if (r.role != receiverRole || !r.active) revert InvalidReceiver();
        _checkLen(location, MAX_LOCATION_LENGTH);
        _checkLen(note, MAX_NOTE_LENGTH);

        p.status = Status.InTransit;
        p.pendingReceiver = to;

        _log(id, EventType.TransferInitiated, msg.sender, to, location, note);
        emit TransferInitiated(id, msg.sender, to, location, note);
    }

    function acceptTransfer(uint256 id, string calldata location)
        external
        onlyActiveParticipant
        whenExists(id)
    {
        Product storage p = products[id];
        if (p.status != Status.InTransit) revert InvalidStatus();
        if (p.pendingReceiver != msg.sender) revert NotPendingReceiver();
        _checkLen(location, MAX_LOCATION_LENGTH);

        address from = p.currentOwner;
        Role r = participants[msg.sender].role;
        p.status = (r == Role.Distributor) ? Status.AtDistributor : Status.AtRetailer;
        p.currentOwner = msg.sender;
        p.pendingReceiver = address(0);

        _log(id, EventType.TransferAccepted, msg.sender, from, location, "");
        emit TransferAccepted(id, msg.sender, location);
    }

    function rejectTransfer(uint256 id, string calldata reason)
        external
        whenExists(id)
    {
        Product storage p = products[id];
        if (p.status != Status.InTransit) revert InvalidStatus();
        if (p.pendingReceiver != msg.sender) revert NotPendingReceiver();
        _checkLen(reason, MAX_NOTE_LENGTH);

        Role r = participants[msg.sender].role;
        p.status = (r == Role.Distributor) ? Status.Created : Status.AtDistributor;
        p.pendingReceiver = address(0);

        _log(id, EventType.TransferRejected, msg.sender, p.currentOwner, "", reason);
        emit TransferRejected(id, msg.sender, reason);
    }

    // ---------- Location Updates & Sale ----------
    function addLocationUpdate(
        uint256 id,
        string calldata location,
        string calldata note
    ) external onlyActiveParticipant whenExists(id) onlyOwnerOf(id) {
        Status s = products[id].status;
        if (s == Status.InTransit || s == Status.Sold) revert InvalidStatus();
        _checkLen(location, MAX_LOCATION_LENGTH);
        _checkLen(note, MAX_NOTE_LENGTH);

        _log(id, EventType.LocationUpdate, msg.sender, address(0), location, note);
        emit LocationUpdated(id, msg.sender, location, note);
    }

    function markSold(uint256 id, string calldata location)
        external
        onlyActiveParticipant
        whenExists(id)
        onlyOwnerOf(id)
    {
        if (participants[msg.sender].role != Role.Retailer) revert WrongRole();
        if (products[id].status != Status.AtRetailer) revert InvalidStatus();
        _checkLen(location, MAX_LOCATION_LENGTH);

        products[id].status = Status.Sold;
        _log(id, EventType.Sold, msg.sender, address(0), location, "");
        emit ProductSold(id, msg.sender, location);
    }

    // ---------- View Functions ----------
    function getParticipant(address wallet)
        external
        view
        returns (Role role, bool active)
    {
        Participant memory p = participants[wallet];
        return (p.role, p.active);
    }

    function exists(uint256 id) external view returns (bool) {
        return id != 0 && id <= productCount;
    }

    function getProduct(uint256 id)
        external
        view
        whenExists(id)
        returns (Product memory)
    {
        return products[id];
    }

    function getHistory(uint256 id)
        external
        view
        whenExists(id)
        returns (HistoryEntry[] memory)
    {
        return histories[id];
    }

    function historyLength(uint256 id)
        external
        view
        whenExists(id)
        returns (uint256)
    {
        return histories[id].length;
    }

    // ---------- Internal Helpers ----------
    function _log(
        uint256 id,
        EventType t,
        address actor,
        address counterparty,
        string memory location,
        string memory note
    ) private {
        histories[id].push(
            HistoryEntry({
                eventType: t,
                actor: actor,
                counterparty: counterparty,
                timestamp: uint64(block.timestamp),
                location: location,
                note: note
            })
        );
    }

    function _checkLen(string calldata s, uint256 max) private pure {
        if (bytes(s).length > max) revert StringTooLong();
    }
}
