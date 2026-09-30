import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SupplyChain } from "../typechain-types";

describe("SupplyChain Smart Contract Test Suite", function () {
  // Enum definitions matching Solidity contract
  enum Role {
    None = 0,
    Manufacturer = 1,
    Distributor = 2,
    Retailer = 3,
  }

  enum Status {
    Created = 0,
    InTransit = 1,
    AtDistributor = 2,
    AtRetailer = 3,
    Sold = 4,
  }

  enum EventType {
    Registered = 0,
    TransferInitiated = 1,
    TransferAccepted = 2,
    TransferRejected = 3,
    LocationUpdate = 4,
    Sold = 5,
  }

  // ---------------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------------
  async function deploySupplyChainFixture() {
    const [
      admin,
      manufacturer,
      distributor,
      retailer,
      extraDistributor,
      extraRetailer,
      unregistered,
      randomUser,
    ] = await ethers.getSigners();

    const SupplyChainFactory = await ethers.getContractFactory("SupplyChain");
    const supplyChain = (await SupplyChainFactory.connect(admin).deploy()) as SupplyChain;
    await supplyChain.waitForDeployment();

    return {
      supplyChain,
      admin,
      manufacturer,
      distributor,
      retailer,
      extraDistributor,
      extraRetailer,
      unregistered,
      randomUser,
    };
  }

  async function deployWithParticipantsFixture() {
    const fixture = await deploySupplyChainFixture();
    const { supplyChain, admin, manufacturer, distributor, retailer, extraDistributor, extraRetailer } = fixture;

    await supplyChain.connect(admin).registerParticipant(manufacturer.address, Role.Manufacturer);
    await supplyChain.connect(admin).registerParticipant(distributor.address, Role.Distributor);
    await supplyChain.connect(admin).registerParticipant(retailer.address, Role.Retailer);
    await supplyChain.connect(admin).registerParticipant(extraDistributor.address, Role.Distributor);
    await supplyChain.connect(admin).registerParticipant(extraRetailer.address, Role.Retailer);

    return fixture;
  }

  async function registeredProductFixture() {
    const fixture = await deployWithParticipantsFixture();
    const { supplyChain, manufacturer } = fixture;

    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("product-1-initial-data"));
    const location = "Factory Plant 1, Berlin";
    await supplyChain.connect(manufacturer).registerProduct(dataHash, location);

    return { ...fixture, productId: 1n, dataHash, location };
  }

  async function inTransitToDistributorFixture() {
    const fixture = await registeredProductFixture();
    const { supplyChain, manufacturer, distributor } = fixture;

    await supplyChain
      .connect(manufacturer)
      .initiateTransfer(1n, distributor.address, "Loading Bay 2", "Dispatched in Truck 42");

    return fixture;
  }

  async function atDistributorFixture() {
    const fixture = await inTransitToDistributorFixture();
    const { supplyChain, distributor } = fixture;

    await supplyChain.connect(distributor).acceptTransfer(1n, "Central Distribution Hub, Frankfurt");

    return fixture;
  }

  async function inTransitToRetailerFixture() {
    const fixture = await atDistributorFixture();
    const { supplyChain, distributor, retailer } = fixture;

    await supplyChain
      .connect(distributor)
      .initiateTransfer(1n, retailer.address, "Outbound Logistics Gate", "Express Cargo Batch");

    return fixture;
  }

  async function atRetailerFixture() {
    const fixture = await inTransitToRetailerFixture();
    const { supplyChain, retailer } = fixture;

    await supplyChain.connect(retailer).acceptTransfer(1n, "Retail Store #101, Munich");

    return fixture;
  }

  async function soldFixture() {
    const fixture = await atRetailerFixture();
    const { supplyChain, retailer } = fixture;

    await supplyChain.connect(retailer).markSold(1n, "POS Register 4");

    return fixture;
  }

  // ===========================================================================
  // 1. Deployment Tests
  // ===========================================================================
  describe("1. Deployment (SC-01)", function () {
    it("SC-01: should set deployer as immutable admin and initialize productCount to 0", async function () {
      const { supplyChain, admin } = await loadFixture(deploySupplyChainFixture);

      expect(await supplyChain.admin()).to.equal(admin.address);
      expect(await supplyChain.productCount()).to.equal(0n);
      expect(await supplyChain.MAX_LOCATION_LENGTH()).to.equal(100n);
      expect(await supplyChain.MAX_NOTE_LENGTH()).to.equal(280n);
    });
  });

  // ===========================================================================
  // 2. Participant Registry & Access Control
  // ===========================================================================
  describe("2. Participant Registry (SC-02, SC-03, SC-04, SC-05, SC-06)", function () {
    it("SC-02: Admin registers each role with active=true and emits ParticipantRegistered", async function () {
      const { supplyChain, admin, manufacturer, distributor, retailer } = await loadFixture(deploySupplyChainFixture);

      await expect(supplyChain.connect(admin).registerParticipant(manufacturer.address, Role.Manufacturer))
        .to.emit(supplyChain, "ParticipantRegistered")
        .withArgs(manufacturer.address, Role.Manufacturer);

      await expect(supplyChain.connect(admin).registerParticipant(distributor.address, Role.Distributor))
        .to.emit(supplyChain, "ParticipantRegistered")
        .withArgs(distributor.address, Role.Distributor);

      await expect(supplyChain.connect(admin).registerParticipant(retailer.address, Role.Retailer))
        .to.emit(supplyChain, "ParticipantRegistered")
        .withArgs(retailer.address, Role.Retailer);

      const [mRole, mActive] = await supplyChain.getParticipant(manufacturer.address);
      expect(mRole).to.equal(Role.Manufacturer);
      expect(mActive).to.be.true;

      const [dRole, dActive] = await supplyChain.getParticipant(distributor.address);
      expect(dRole).to.equal(Role.Distributor);
      expect(dActive).to.be.true;

      const [rRole, rActive] = await supplyChain.getParticipant(retailer.address);
      expect(rRole).to.equal(Role.Retailer);
      expect(rActive).to.be.true;
    });

    it("SC-03: Non-admin caller cannot register participant and reverts with NotAdmin", async function () {
      const { supplyChain, manufacturer, randomUser } = await loadFixture(deploySupplyChainFixture);

      await expect(
        supplyChain.connect(randomUser).registerParticipant(manufacturer.address, Role.Manufacturer)
      ).to.be.revertedWithCustomError(supplyChain, "NotAdmin");

      const [role, active] = await supplyChain.getParticipant(manufacturer.address);
      expect(role).to.equal(Role.None);
      expect(active).to.be.false;
    });

    it("SC-04: Cannot register the same wallet twice and reverts with AlreadyRegistered", async function () {
      const { supplyChain, admin, manufacturer } = await loadFixture(deploySupplyChainFixture);

      await supplyChain.connect(admin).registerParticipant(manufacturer.address, Role.Manufacturer);

      await expect(
        supplyChain.connect(admin).registerParticipant(manufacturer.address, Role.Distributor)
      ).to.be.revertedWithCustomError(supplyChain, "AlreadyRegistered");

      // Verify original role was not modified
      const [role] = await supplyChain.getParticipant(manufacturer.address);
      expect(role).to.equal(Role.Manufacturer);
    });

    it("SC-05: Cannot register address(0) or Role.None", async function () {
      const { supplyChain, admin, randomUser } = await loadFixture(deploySupplyChainFixture);

      await expect(
        supplyChain.connect(admin).registerParticipant(ethers.ZeroAddress, Role.Manufacturer)
      ).to.be.revertedWithCustomError(supplyChain, "ZeroAddress");

      await expect(
        supplyChain.connect(admin).registerParticipant(randomUser.address, Role.None)
      ).to.be.revertedWithCustomError(supplyChain, "InvalidRole");
    });

    it("SC-06: Admin can deactivate and reactivate participants emitting ParticipantStatusChanged", async function () {
      const { supplyChain, admin, manufacturer, randomUser } = await loadFixture(deployWithParticipantsFixture);

      // Deactivate
      await expect(supplyChain.connect(admin).setParticipantActive(manufacturer.address, false))
        .to.emit(supplyChain, "ParticipantStatusChanged")
        .withArgs(manufacturer.address, false);

      let [, active] = await supplyChain.getParticipant(manufacturer.address);
      expect(active).to.be.false;

      // Reactivate
      await expect(supplyChain.connect(admin).setParticipantActive(manufacturer.address, true))
        .to.emit(supplyChain, "ParticipantStatusChanged")
        .withArgs(manufacturer.address, true);

      [, active] = await supplyChain.getParticipant(manufacturer.address);
      expect(active).to.be.true;

      // Non-admin cannot change active status
      await expect(
        supplyChain.connect(randomUser).setParticipantActive(manufacturer.address, false)
      ).to.be.revertedWithCustomError(supplyChain, "NotAdmin");

      // Cannot change active status for unregistered wallet
      await expect(
        supplyChain.connect(admin).setParticipantActive(randomUser.address, false)
      ).to.be.revertedWithCustomError(supplyChain, "NotParticipant");
    });
  });

  // ===========================================================================
  // 3. Product Registration
  // ===========================================================================
  describe("3. Product Registration (SC-07, SC-08, SC-09, SC-10, SC-11, SC-12, SC-13)", function () {
    it("SC-07: Active Manufacturer registers product with ID 1, status Created, and history length 1", async function () {
      const { supplyChain, manufacturer } = await loadFixture(deployWithParticipantsFixture);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("prod-1-test"));
      const location = "Munich Factory";

      await expect(supplyChain.connect(manufacturer).registerProduct(hash, location))
        .to.emit(supplyChain, "ProductRegistered")
        .withArgs(1n, manufacturer.address, hash, location);

      expect(await supplyChain.productCount()).to.equal(1n);
      expect(await supplyChain.exists(1n)).to.be.true;

      const product = await supplyChain.getProduct(1n);
      expect(product.id).to.equal(1n);
      expect(product.dataHash).to.equal(hash);
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.currentOwner).to.equal(manufacturer.address);
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress);
      expect(product.status).to.equal(Status.Created);
      expect(product.createdAt).to.be.greaterThan(0n);

      expect(await supplyChain.historyLength(1n)).to.equal(1n);
      const history = await supplyChain.getHistory(1n);
      expect(history.length).to.equal(1);
      expect(history[0].eventType).to.equal(EventType.Registered);
      expect(history[0].actor).to.equal(manufacturer.address);
      expect(history[0].counterparty).to.equal(ethers.ZeroAddress);
      expect(history[0].location).to.equal(location);
      expect(history[0].note).to.equal("");
    });

    it("SC-08: Second product registration increments counter to ID 2", async function () {
      const { supplyChain, manufacturer } = await loadFixture(deployWithParticipantsFixture);

      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("prod-1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("prod-2"));

      await supplyChain.connect(manufacturer).registerProduct(hash1, "Location 1");
      await supplyChain.connect(manufacturer).registerProduct(hash2, "Location 2");

      expect(await supplyChain.productCount()).to.equal(2n);
      expect(await supplyChain.exists(1n)).to.be.true;
      expect(await supplyChain.exists(2n)).to.be.true;

      const p1 = await supplyChain.getProduct(1n);
      const p2 = await supplyChain.getProduct(2n);
      expect(p1.id).to.equal(1n);
      expect(p2.id).to.equal(2n);
      expect(p1.dataHash).to.equal(hash1);
      expect(p2.dataHash).to.equal(hash2);
    });

    it("SC-09: Non-manufacturer cannot register product (reverts with WrongRole)", async function () {
      const { supplyChain, distributor, retailer, admin } = await loadFixture(deployWithParticipantsFixture);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("wrong-role-test"));

      await expect(supplyChain.connect(distributor).registerProduct(hash, "Dist Hub"))
        .to.be.revertedWithCustomError(supplyChain, "WrongRole");

      await expect(supplyChain.connect(retailer).registerProduct(hash, "Retail Shop"))
        .to.be.revertedWithCustomError(supplyChain, "WrongRole");

      // Admin has no Participant role, so reverts with NotParticipant
      await expect(supplyChain.connect(admin).registerProduct(hash, "HQ"))
        .to.be.revertedWithCustomError(supplyChain, "NotParticipant");

      expect(await supplyChain.productCount()).to.equal(0n);
    });

    it("SC-10: Unregistered wallet cannot register product (reverts with NotParticipant)", async function () {
      const { supplyChain, unregistered } = await loadFixture(deployWithParticipantsFixture);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("unreg-test"));
      await expect(supplyChain.connect(unregistered).registerProduct(hash, "Unknown"))
        .to.be.revertedWithCustomError(supplyChain, "NotParticipant");

      expect(await supplyChain.productCount()).to.equal(0n);
    });

    it("SC-11: Deactivated manufacturer cannot register product (reverts with ParticipantInactive)", async function () {
      const { supplyChain, admin, manufacturer } = await loadFixture(deployWithParticipantsFixture);

      await supplyChain.connect(admin).setParticipantActive(manufacturer.address, false);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("deactivated-mfg-test"));
      await expect(supplyChain.connect(manufacturer).registerProduct(hash, "Factory"))
        .to.be.revertedWithCustomError(supplyChain, "ParticipantInactive");

      expect(await supplyChain.productCount()).to.equal(0n);
    });

    it("SC-12: Zero hash (EmptyHash) and duplicate hash (DuplicateHash) revert", async function () {
      const { supplyChain, manufacturer } = await loadFixture(deployWithParticipantsFixture);

      // EmptyHash
      await expect(supplyChain.connect(manufacturer).registerProduct(ethers.ZeroHash, "Factory"))
        .to.be.revertedWithCustomError(supplyChain, "EmptyHash");

      // Valid first registration
      const hash = ethers.keccak256(ethers.toUtf8Bytes("unique-hash-123"));
      await supplyChain.connect(manufacturer).registerProduct(hash, "Factory");

      // Duplicate registration reverts
      await expect(supplyChain.connect(manufacturer).registerProduct(hash, "Factory 2"))
        .to.be.revertedWithCustomError(supplyChain, "DuplicateHash");

      expect(await supplyChain.productCount()).to.equal(1n);
    });

    it("SC-13: Location over 100 bytes reverts with StringTooLong", async function () {
      const { supplyChain, manufacturer } = await loadFixture(deployWithParticipantsFixture);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("long-location-test"));

      // Exactly 100 bytes (ASCII) -> Success
      const validLocation100 = "a".repeat(100);
      await expect(supplyChain.connect(manufacturer).registerProduct(hash, validLocation100)).to.not.be.reverted;

      // 101 bytes -> Revert
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("long-location-test-2"));
      const invalidLocation101 = "a".repeat(101);
      await expect(supplyChain.connect(manufacturer).registerProduct(hash2, invalidLocation101))
        .to.be.revertedWithCustomError(supplyChain, "StringTooLong");

      // UTF-8 multibyte boundary check: 34 3-byte characters = 102 bytes -> Revert
      const hash3 = ethers.keccak256(ethers.toUtf8Bytes("long-location-test-3"));
      const multiByte102Bytes = "€".repeat(34); // each '€' is 3 bytes in UTF-8
      expect(Buffer.from(multiByte102Bytes).length).to.equal(102);
      await expect(supplyChain.connect(manufacturer).registerProduct(hash3, multiByte102Bytes))
        .to.be.revertedWithCustomError(supplyChain, "StringTooLong");
    });
  });

  // ===========================================================================
  // 4. Transfer Initiation (Manufacturer -> Distributor & Distributor -> Retailer)
  // ===========================================================================
  describe("4. Transfer Initiation (SC-14, SC-15, SC-16, SC-17, SC-18, SC-27)", function () {
    it("SC-14: Manufacturer initiates transfer to Distributor (sets InTransit, stores pendingReceiver, owner unchanged, emits TransferInitiated)", async function () {
      const { supplyChain, manufacturer, distributor } = await loadFixture(registeredProductFixture);

      const location = "Loading Dock A";
      const note = "Sent with courier tracking #TRK-1001";

      await expect(supplyChain.connect(manufacturer).initiateTransfer(1n, distributor.address, location, note))
        .to.emit(supplyChain, "TransferInitiated")
        .withArgs(1n, manufacturer.address, distributor.address, location, note);

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.InTransit);
      expect(product.pendingReceiver).to.equal(distributor.address);
      expect(product.currentOwner).to.equal(manufacturer.address); // Invariant: owner does not change during initiation

      const history = await supplyChain.getHistory(1n);
      expect(history.length).to.equal(2);
      expect(history[1].eventType).to.equal(EventType.TransferInitiated);
      expect(history[1].actor).to.equal(manufacturer.address);
      expect(history[1].counterparty).to.equal(distributor.address);
      expect(history[1].location).to.equal(location);
      expect(history[1].note).to.equal(note);
    });

    it("SC-15 & SC-27: Transfer to a Retailer directly from Created reverts with InvalidReceiver", async function () {
      const { supplyChain, manufacturer, retailer } = await loadFixture(registeredProductFixture);

      await expect(
        supplyChain.connect(manufacturer).initiateTransfer(1n, retailer.address, "Dock", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidReceiver");

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.Created);
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress);
    });

    it("SC-16: Transfer to inactive Distributor reverts with InvalidReceiver", async function () {
      const { supplyChain, admin, manufacturer, distributor } = await loadFixture(registeredProductFixture);

      await supplyChain.connect(admin).setParticipantActive(distributor.address, false);

      await expect(
        supplyChain.connect(manufacturer).initiateTransfer(1n, distributor.address, "Dock", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidReceiver");
    });

    it("SC-17: Non-owner cannot initiate transfer (reverts with NotOwner)", async function () {
      const { supplyChain, distributor, extraDistributor } = await loadFixture(registeredProductFixture);

      await expect(
        supplyChain.connect(extraDistributor).initiateTransfer(1n, distributor.address, "Dock", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "NotOwner");
    });

    it("SC-18: Initiate transfer while already InTransit reverts with InvalidStatus", async function () {
      const { supplyChain, manufacturer, extraDistributor } = await loadFixture(inTransitToDistributorFixture);

      await expect(
        supplyChain.connect(manufacturer).initiateTransfer(1n, extraDistributor.address, "Dock", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidStatus");
    });

    it("Transfer to unregistered wallet or address(0) reverts with InvalidReceiver", async function () {
      const { supplyChain, manufacturer, unregistered } = await loadFixture(registeredProductFixture);

      await expect(
        supplyChain.connect(manufacturer).initiateTransfer(1n, unregistered.address, "Dock", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidReceiver");

      await expect(
        supplyChain.connect(manufacturer).initiateTransfer(1n, ethers.ZeroAddress, "Dock", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidReceiver");
    });

    it("Transfer initiation with note > 280 bytes reverts with StringTooLong", async function () {
      const { supplyChain, manufacturer, distributor } = await loadFixture(registeredProductFixture);

      // Exactly 280 bytes note -> Success
      const validNote280 = "n".repeat(280);
      await expect(supplyChain.connect(manufacturer).initiateTransfer(1n, distributor.address, "Dock", validNote280))
        .to.not.be.reverted;

      // Reset fixture for 281 bytes check
      const freshFixture = await loadFixture(registeredProductFixture);
      const invalidNote281 = "n".repeat(281);
      await expect(
        freshFixture.supplyChain.connect(freshFixture.manufacturer).initiateTransfer(1n, freshFixture.distributor.address, "Dock", invalidNote281)
      ).to.be.revertedWithCustomError(freshFixture.supplyChain, "StringTooLong");
    });
  });

  // ===========================================================================
  // 5. Transfer Acceptance
  // ===========================================================================
  describe("5. Transfer Acceptance (SC-19, SC-20, SC-21, SC-25, SC-26)", function () {
    it("SC-19: Distributor accepts transfer (sets AtDistributor, updates owner, clears pendingReceiver, emits TransferAccepted)", async function () {
      const { supplyChain, manufacturer, distributor } = await loadFixture(inTransitToDistributorFixture);

      const location = "Warehouse Frankfurt";

      await expect(supplyChain.connect(distributor).acceptTransfer(1n, location))
        .to.emit(supplyChain, "TransferAccepted")
        .withArgs(1n, distributor.address, location);

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.AtDistributor);
      expect(product.currentOwner).to.equal(distributor.address);
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress);

      const history = await supplyChain.getHistory(1n);
      expect(history.length).to.equal(3);
      expect(history[2].eventType).to.equal(EventType.TransferAccepted);
      expect(history[2].actor).to.equal(distributor.address);
      expect(history[2].counterparty).to.equal(manufacturer.address);
      expect(history[2].location).to.equal(location);
    });

    it("SC-20: Wrong wallet cannot accept transfer (reverts with NotPendingReceiver)", async function () {
      const { supplyChain, manufacturer, extraDistributor, retailer } = await loadFixture(inTransitToDistributorFixture);

      await expect(supplyChain.connect(extraDistributor).acceptTransfer(1n, "Hub"))
        .to.be.revertedWithCustomError(supplyChain, "NotPendingReceiver");

      await expect(supplyChain.connect(manufacturer).acceptTransfer(1n, "Hub"))
        .to.be.revertedWithCustomError(supplyChain, "NotPendingReceiver");

      await expect(supplyChain.connect(retailer).acceptTransfer(1n, "Store"))
        .to.be.revertedWithCustomError(supplyChain, "NotPendingReceiver");

      // Verify state was not mutated
      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.InTransit);
      expect(product.currentOwner).to.equal(manufacturer.address);
    });

    it("SC-21: Accept when not InTransit reverts with InvalidStatus", async function () {
      const { supplyChain, distributor } = await loadFixture(registeredProductFixture);

      await expect(supplyChain.connect(distributor).acceptTransfer(1n, "Hub"))
        .to.be.revertedWithCustomError(supplyChain, "InvalidStatus");
    });

    it("SC-25: Deactivated receiver cannot accept transfer (reverts with ParticipantInactive)", async function () {
      const { supplyChain, admin, distributor } = await loadFixture(inTransitToDistributorFixture);

      await supplyChain.connect(admin).setParticipantActive(distributor.address, false);

      await expect(supplyChain.connect(distributor).acceptTransfer(1n, "Hub"))
        .to.be.revertedWithCustomError(supplyChain, "ParticipantInactive");
    });

    it("SC-26: Distributor initiates to Retailer, Retailer accepts (sets AtRetailer, updates owner to Retailer)", async function () {
      const { supplyChain, distributor, retailer } = await loadFixture(atDistributorFixture);

      // Initiate transfer to Retailer
      await supplyChain.connect(distributor).initiateTransfer(1n, retailer.address, "Depot Out", "To Store");
      let product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.InTransit);
      expect(product.pendingReceiver).to.equal(retailer.address);
      expect(product.currentOwner).to.equal(distributor.address);

      // Retailer accepts
      await expect(supplyChain.connect(retailer).acceptTransfer(1n, "Munich Retail Store"))
        .to.emit(supplyChain, "TransferAccepted")
        .withArgs(1n, retailer.address, "Munich Retail Store");

      product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.AtRetailer);
      expect(product.currentOwner).to.equal(retailer.address);
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress);
    });

    it("Accept transfer with location > 100 bytes reverts with StringTooLong", async function () {
      const { supplyChain, distributor } = await loadFixture(inTransitToDistributorFixture);

      const invalidLocation101 = "x".repeat(101);
      await expect(supplyChain.connect(distributor).acceptTransfer(1n, invalidLocation101))
        .to.be.revertedWithCustomError(supplyChain, "StringTooLong");
    });
  });

  // ===========================================================================
  // 6. Transfer Rejection & Rollback
  // ===========================================================================
  describe("6. Transfer Rejection (SC-22, SC-23, SC-24)", function () {
    it("SC-22: Distributor rejects transfer (rolls status back to Created, preserves Manufacturer owner, clears pendingReceiver, emits TransferRejected)", async function () {
      const { supplyChain, manufacturer, distributor } = await loadFixture(inTransitToDistributorFixture);

      const reason = "Damaged packaging on receipt";

      await expect(supplyChain.connect(distributor).rejectTransfer(1n, reason))
        .to.emit(supplyChain, "TransferRejected")
        .withArgs(1n, distributor.address, reason);

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.Created);
      expect(product.currentOwner).to.equal(manufacturer.address); // Preserved
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress); // Cleared

      const history = await supplyChain.getHistory(1n);
      expect(history.length).to.equal(3);
      expect(history[2].eventType).to.equal(EventType.TransferRejected);
      expect(history[2].actor).to.equal(distributor.address);
      expect(history[2].counterparty).to.equal(manufacturer.address);
      expect(history[2].location).to.equal("");
      expect(history[2].note).to.equal(reason);
    });

    it("SC-23: Retailer rejects transfer from Distributor (rolls status back to AtDistributor, preserves Distributor owner)", async function () {
      const { supplyChain, distributor, retailer } = await loadFixture(inTransitToRetailerFixture);

      const reason = "Wrong batch delivered";

      await expect(supplyChain.connect(retailer).rejectTransfer(1n, reason))
        .to.emit(supplyChain, "TransferRejected")
        .withArgs(1n, retailer.address, reason);

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.AtDistributor);
      expect(product.currentOwner).to.equal(distributor.address);
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress);
    });

    it("SC-24: Deactivated receiver CAN still reject transfer to avoid stuck custody", async function () {
      const { supplyChain, admin, manufacturer, distributor } = await loadFixture(inTransitToDistributorFixture);

      // Admin deactivates distributor while product is in transit
      await supplyChain.connect(admin).setParticipantActive(distributor.address, false);

      // Deactivated receiver rejection succeeds
      await expect(supplyChain.connect(distributor).rejectTransfer(1n, "Cannot process - facility closed"))
        .to.emit(supplyChain, "TransferRejected");

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.Created);
      expect(product.currentOwner).to.equal(manufacturer.address);
      expect(product.pendingReceiver).to.equal(ethers.ZeroAddress);
    });

    it("Reject when not InTransit or by non-pendingReceiver reverts", async function () {
      const { supplyChain, distributor, extraDistributor } = await loadFixture(inTransitToDistributorFixture);

      // Non-pending receiver reverts
      await expect(supplyChain.connect(extraDistributor).rejectTransfer(1n, "Reason"))
        .to.be.revertedWithCustomError(supplyChain, "NotPendingReceiver");

      // Reject when not in transit reverts
      const atDistFixture = await loadFixture(atDistributorFixture);
      await expect(atDistFixture.supplyChain.connect(atDistFixture.distributor).rejectTransfer(1n, "Reason"))
        .to.be.revertedWithCustomError(atDistFixture.supplyChain, "InvalidStatus");
    });

    it("Reject reason > 280 bytes reverts with StringTooLong", async function () {
      const { supplyChain, distributor } = await loadFixture(inTransitToDistributorFixture);

      const invalidReason281 = "r".repeat(281);
      await expect(supplyChain.connect(distributor).rejectTransfer(1n, invalidReason281))
        .to.be.revertedWithCustomError(supplyChain, "StringTooLong");
    });
  });

  // ===========================================================================
  // 7. Location Updates
  // ===========================================================================
  describe("7. Location Updates (SC-28, SC-29)", function () {
    it("SC-28: Owner adds location updates in Created, AtDistributor, and AtRetailer (history grows, status unchanged, emits LocationUpdated)", async function () {
      // 1. Created state update by Manufacturer
      const reg = await loadFixture(registeredProductFixture);
      await expect(reg.supplyChain.connect(reg.manufacturer).addLocationUpdate(1n, "Factory Bay 3", "Quality Inspection"))
        .to.emit(reg.supplyChain, "LocationUpdated")
        .withArgs(1n, reg.manufacturer.address, "Factory Bay 3", "Quality Inspection");

      let p = await reg.supplyChain.getProduct(1n);
      expect(p.status).to.equal(Status.Created);
      expect(await reg.supplyChain.historyLength(1n)).to.equal(2n);

      // 2. AtDistributor state update by Distributor
      const atDist = await loadFixture(atDistributorFixture);
      await expect(atDist.supplyChain.connect(atDist.distributor).addLocationUpdate(1n, "Cold Storage Hub", "Temp 4C"))
        .to.emit(atDist.supplyChain, "LocationUpdated")
        .withArgs(1n, atDist.distributor.address, "Cold Storage Hub", "Temp 4C");

      p = await atDist.supplyChain.getProduct(1n);
      expect(p.status).to.equal(Status.AtDistributor);
      expect(await atDist.supplyChain.historyLength(1n)).to.equal(4n); // Reg, TxInit, TxAcc, LocUpd

      // 3. AtRetailer state update by Retailer
      const atRet = await loadFixture(atRetailerFixture);
      await expect(atRet.supplyChain.connect(atRet.retailer).addLocationUpdate(1n, "Aisle 4 Display", "On Shelf"))
        .to.emit(atRet.supplyChain, "LocationUpdated")
        .withArgs(1n, atRet.retailer.address, "Aisle 4 Display", "On Shelf");

      p = await atRet.supplyChain.getProduct(1n);
      expect(p.status).to.equal(Status.AtRetailer);
      expect(await atRet.supplyChain.historyLength(1n)).to.equal(6n);
    });

    it("SC-29: Location update while InTransit or after Sold reverts with InvalidStatus", async function () {
      // InTransit
      const inTransit = await loadFixture(inTransitToDistributorFixture);
      await expect(
        inTransit.supplyChain.connect(inTransit.manufacturer).addLocationUpdate(1n, "Highway M1", "GPS Ping")
      ).to.be.revertedWithCustomError(inTransit.supplyChain, "InvalidStatus");

      // Sold
      const sold = await loadFixture(soldFixture);
      await expect(
        sold.supplyChain.connect(sold.retailer).addLocationUpdate(1n, "Customer Residence", "Delivered")
      ).to.be.revertedWithCustomError(sold.supplyChain, "InvalidStatus");
    });

    it("Non-owner or inactive owner cannot add location update", async function () {
      const { supplyChain, admin, manufacturer, distributor } = await loadFixture(registeredProductFixture);

      // Non-owner
      await expect(
        supplyChain.connect(distributor).addLocationUpdate(1n, "Loc", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "NotOwner");

      // Inactive owner
      await supplyChain.connect(admin).setParticipantActive(manufacturer.address, false);
      await expect(
        supplyChain.connect(manufacturer).addLocationUpdate(1n, "Loc", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "ParticipantInactive");
    });

    it("Location update with location > 100 bytes or note > 280 bytes reverts with StringTooLong", async function () {
      const { supplyChain, manufacturer } = await loadFixture(registeredProductFixture);

      await expect(
        supplyChain.connect(manufacturer).addLocationUpdate(1n, "l".repeat(101), "Note")
      ).to.be.revertedWithCustomError(supplyChain, "StringTooLong");

      await expect(
        supplyChain.connect(manufacturer).addLocationUpdate(1n, "Loc", "n".repeat(281))
      ).to.be.revertedWithCustomError(supplyChain, "StringTooLong");
    });
  });

  // ===========================================================================
  // 8. Mark Sold & Sold Finality
  // ===========================================================================
  describe("8. Mark Sold & Sold Finality (SC-30, SC-31, SC-32, SC-33)", function () {
    it("SC-30: Retailer marks AtRetailer product Sold (sets Sold, emits ProductSold, appends history)", async function () {
      const { supplyChain, retailer } = await loadFixture(atRetailerFixture);

      const location = "POS Checkout Counter 2";

      await expect(supplyChain.connect(retailer).markSold(1n, location))
        .to.emit(supplyChain, "ProductSold")
        .withArgs(1n, retailer.address, location);

      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.Sold);
      expect(product.currentOwner).to.equal(retailer.address);

      const history = await supplyChain.getHistory(1n);
      const lastEntry = history[history.length - 1];
      expect(lastEntry.eventType).to.equal(EventType.Sold);
      expect(lastEntry.actor).to.equal(retailer.address);
      expect(lastEntry.counterparty).to.equal(ethers.ZeroAddress);
      expect(lastEntry.location).to.equal(location);
      expect(lastEntry.note).to.equal("");
    });

    it("SC-31: Non-retailer cannot mark sold (reverts with WrongRole)", async function () {
      const { supplyChain, distributor } = await loadFixture(atDistributorFixture);

      await expect(supplyChain.connect(distributor).markSold(1n, "Counter"))
        .to.be.revertedWithCustomError(supplyChain, "WrongRole");
    });

    it("SC-32: Retailer cannot mark sold when product is not AtRetailer (reverts with InvalidStatus or NotOwner)", async function () {
      const { supplyChain, retailer } = await loadFixture(registeredProductFixture);

      // Product is in Created and owned by Manufacturer -> NotOwner
      await expect(supplyChain.connect(retailer).markSold(1n, "Counter"))
        .to.be.revertedWithCustomError(supplyChain, "NotOwner");

      // Product in transit to retailer -> not owned yet -> NotOwner
      const inTransit = await loadFixture(inTransitToRetailerFixture);
      await expect(inTransit.supplyChain.connect(inTransit.retailer).markSold(1n, "Counter"))
        .to.be.revertedWithCustomError(inTransit.supplyChain, "NotOwner");
    });

    it("SC-33: Any state-changing write after Sold reverts (Sold is terminal)", async function () {
      const { supplyChain, retailer, distributor, extraRetailer } = await loadFixture(soldFixture);

      // 1. initiateTransfer
      await expect(
        supplyChain.connect(retailer).initiateTransfer(1n, distributor.address, "Loc", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidStatus");

      // 2. acceptTransfer
      await expect(
        supplyChain.connect(retailer).acceptTransfer(1n, "Loc")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidStatus");

      // 3. rejectTransfer
      await expect(
        supplyChain.connect(retailer).rejectTransfer(1n, "Reason")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidStatus");

      // 4. addLocationUpdate
      await expect(
        supplyChain.connect(retailer).addLocationUpdate(1n, "Loc", "Note")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidStatus");

      // 5. markSold again
      await expect(
        supplyChain.connect(retailer).markSold(1n, "Loc")
      ).to.be.revertedWithCustomError(supplyChain, "InvalidStatus");

      // Verify state remains immutable
      const product = await supplyChain.getProduct(1n);
      expect(product.status).to.equal(Status.Sold);
      expect(product.currentOwner).to.equal(retailer.address);
    });

    it("Mark sold with location > 100 bytes reverts with StringTooLong", async function () {
      const { supplyChain, retailer } = await loadFixture(atRetailerFixture);

      await expect(supplyChain.connect(retailer).markSold(1n, "l".repeat(101)))
        .to.be.revertedWithCustomError(supplyChain, "StringTooLong");
    });
  });

  // ===========================================================================
  // 9. View Functions & Unknown Product Handling
  // ===========================================================================
  describe("9. View Functions & Bounds (SC-34)", function () {
    it("SC-34: getProduct(0), getProduct(999), getHistory(0), getHistory(999), historyLength(0), historyLength(999) revert with ProductNotFound", async function () {
      const { supplyChain } = await loadFixture(registeredProductFixture);

      // ID 0
      expect(await supplyChain.exists(0n)).to.be.false;
      await expect(supplyChain.getProduct(0n)).to.be.revertedWithCustomError(supplyChain, "ProductNotFound");
      await expect(supplyChain.getHistory(0n)).to.be.revertedWithCustomError(supplyChain, "ProductNotFound");
      await expect(supplyChain.historyLength(0n)).to.be.revertedWithCustomError(supplyChain, "ProductNotFound");

      // Unknown ID 999
      expect(await supplyChain.exists(999n)).to.be.false;
      await expect(supplyChain.getProduct(999n)).to.be.revertedWithCustomError(supplyChain, "ProductNotFound");
      await expect(supplyChain.getHistory(999n)).to.be.revertedWithCustomError(supplyChain, "ProductNotFound");
      await expect(supplyChain.historyLength(999n)).to.be.revertedWithCustomError(supplyChain, "ProductNotFound");

      // Valid ID 1
      expect(await supplyChain.exists(1n)).to.be.true;
      expect((await supplyChain.getProduct(1n)).id).to.equal(1n);
      expect((await supplyChain.getHistory(1n)).length).to.equal(1);
      expect(await supplyChain.historyLength(1n)).to.equal(1n);
    });

    it("getParticipant view returns correct info for unregistered, registered, and deactivated accounts", async function () {
      const { supplyChain, admin, manufacturer, unregistered } = await loadFixture(deployWithParticipantsFixture);

      // Unregistered
      const [uRole, uActive] = await supplyChain.getParticipant(unregistered.address);
      expect(uRole).to.equal(Role.None);
      expect(uActive).to.be.false;

      // Registered active
      const [mRole, mActive] = await supplyChain.getParticipant(manufacturer.address);
      expect(mRole).to.equal(Role.Manufacturer);
      expect(mActive).to.be.true;

      // Deactivated
      await supplyChain.connect(admin).setParticipantActive(manufacturer.address, false);
      const [dRole, dActive] = await supplyChain.getParticipant(manufacturer.address);
      expect(dRole).to.equal(Role.Manufacturer);
      expect(dActive).to.be.false;
    });
  });

  // ===========================================================================
  // 10. Complete Lifecycle Journey & History Order
  // ===========================================================================
  describe("10. History Order & Event Emission (SC-35, SC-36)", function () {
    it("SC-35 & SC-36: Full 9-step journey executes cleanly, emits all events, and preserves exact chronological history", async function () {
      const { supplyChain, manufacturer, distributor, retailer } = await loadFixture(deployWithParticipantsFixture);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("full-journey-product"));

      // 1. Registered (Manufacturer)
      await expect(supplyChain.connect(manufacturer).registerProduct(hash, "Plant 10"))
        .to.emit(supplyChain, "ProductRegistered")
        .withArgs(1n, manufacturer.address, hash, "Plant 10");

      // 2. TransferInitiated (Manufacturer -> Distributor)
      await expect(supplyChain.connect(manufacturer).initiateTransfer(1n, distributor.address, "Dock 1", "To Dist"))
        .to.emit(supplyChain, "TransferInitiated")
        .withArgs(1n, manufacturer.address, distributor.address, "Dock 1", "To Dist");

      // 3. TransferAccepted (Distributor)
      await expect(supplyChain.connect(distributor).acceptTransfer(1n, "Dist Hub"))
        .to.emit(supplyChain, "TransferAccepted")
        .withArgs(1n, distributor.address, "Dist Hub");

      // 4. LocationUpdate (Distributor)
      await expect(supplyChain.connect(distributor).addLocationUpdate(1n, "Dist Warehouse Aisle 2", "Pallet checked"))
        .to.emit(supplyChain, "LocationUpdated")
        .withArgs(1n, distributor.address, "Dist Warehouse Aisle 2", "Pallet checked");

      // 5. TransferInitiated (Distributor -> Retailer)
      await expect(supplyChain.connect(distributor).initiateTransfer(1n, retailer.address, "Gate 3", "First Dispatch"))
        .to.emit(supplyChain, "TransferInitiated")
        .withArgs(1n, distributor.address, retailer.address, "Gate 3", "First Dispatch");

      // 6. TransferRejected (Retailer rejects first attempt)
      await expect(supplyChain.connect(retailer).rejectTransfer(1n, "Incorrect invoice attached"))
        .to.emit(supplyChain, "TransferRejected")
        .withArgs(1n, retailer.address, "Incorrect invoice attached");

      // 7. TransferInitiated (Distributor re-initiates to Retailer)
      await expect(supplyChain.connect(distributor).initiateTransfer(1n, retailer.address, "Gate 3", "Re-sent Dispatch with Correct Invoice"))
        .to.emit(supplyChain, "TransferInitiated")
        .withArgs(1n, distributor.address, retailer.address, "Gate 3", "Re-sent Dispatch with Correct Invoice");

      // 8. TransferAccepted (Retailer accepts)
      await expect(supplyChain.connect(retailer).acceptTransfer(1n, "Store Stockroom"))
        .to.emit(supplyChain, "TransferAccepted")
        .withArgs(1n, retailer.address, "Store Stockroom");

      // 9. Sold (Retailer marks sold)
      await expect(supplyChain.connect(retailer).markSold(1n, "Register 1"))
        .to.emit(supplyChain, "ProductSold")
        .withArgs(1n, retailer.address, "Register 1");

      // Verify complete history length and chronological entries
      const history = await supplyChain.getHistory(1n);
      expect(history.length).to.equal(9);

      const expectedSequence = [
        { type: EventType.Registered, actor: manufacturer.address, counterparty: ethers.ZeroAddress, loc: "Plant 10", note: "" },
        { type: EventType.TransferInitiated, actor: manufacturer.address, counterparty: distributor.address, loc: "Dock 1", note: "To Dist" },
        { type: EventType.TransferAccepted, actor: distributor.address, counterparty: manufacturer.address, loc: "Dist Hub", note: "" },
        { type: EventType.LocationUpdate, actor: distributor.address, counterparty: ethers.ZeroAddress, loc: "Dist Warehouse Aisle 2", note: "Pallet checked" },
        { type: EventType.TransferInitiated, actor: distributor.address, counterparty: retailer.address, loc: "Gate 3", note: "First Dispatch" },
        { type: EventType.TransferRejected, actor: retailer.address, counterparty: distributor.address, loc: "", note: "Incorrect invoice attached" },
        { type: EventType.TransferInitiated, actor: distributor.address, counterparty: retailer.address, loc: "Gate 3", note: "Re-sent Dispatch with Correct Invoice" },
        { type: EventType.TransferAccepted, actor: retailer.address, counterparty: distributor.address, loc: "Store Stockroom", note: "" },
        { type: EventType.Sold, actor: retailer.address, counterparty: ethers.ZeroAddress, loc: "Register 1", note: "" },
      ];

      let lastTimestamp = 0n;
      for (let i = 0; i < 9; i++) {
        const entry = history[i];
        const exp = expectedSequence[i];

        expect(entry.eventType).to.equal(exp.type, `Step ${i + 1} eventType mismatch`);
        expect(entry.actor).to.equal(exp.actor, `Step ${i + 1} actor mismatch`);
        expect(entry.counterparty).to.equal(exp.counterparty, `Step ${i + 1} counterparty mismatch`);
        expect(entry.location).to.equal(exp.loc, `Step ${i + 1} location mismatch`);
        expect(entry.note).to.equal(exp.note, `Step ${i + 1} note mismatch`);
        expect(entry.timestamp).to.be.greaterThanOrEqual(lastTimestamp, `Step ${i + 1} timestamp order mismatch`);
        lastTimestamp = entry.timestamp;
      }
    });
  });
});
