// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AgriSupplyChain {
    address public owner;
    uint256 public productCount;

    // Improved role management
    mapping(bytes32 => mapping(address => bool)) private roles;
    mapping(address => bool) private admins;

    // New price history tracking
    struct PriceHistory {
        uint256 timestamp;
        uint256 price;
    }

    struct Actor {
        bool isRegistered;
        string name;
        string role;
    }

    struct Product {
        uint256 id;
        string name;
        uint256 quantity;
        uint256 price;
        address currentOwner;
        ProductStatus status;
        string originFarm;
        uint256 harvestDate;
        mapping(uint256 => QualityCheck) qualityChecks;
        uint256 qualityCheckCount;
        PriceHistory[] priceHistory;
        string batchId; // New field for batch tracking
        uint256 expirationDate;
    }

    struct QualityCheck {
        address inspector;
        uint256 date;
        string notes;
        bool passed;
    }

    enum ProductStatus { Created, Processed, Packaged, ForSale, Sold, Shipped, Received, Rejected }

    mapping(address => Actor) public actors;
    mapping(uint256 => Product) public products;
    mapping(address => uint256) public balances;

    event ActorRegistered(address indexed actorAddress, string name, string role);
    event ProductCreated(uint256 indexed productId, string name, address indexed farmer);
    event ProductTransferred(uint256 indexed productId, address indexed from, address indexed to);
    event ProductStatusUpdated(uint256 indexed productId, ProductStatus status);
    event QualityCheckPerformed(uint256 indexed productId, address indexed inspector, bool passed);
    event PaymentProcessed(address indexed from, address indexed to, uint256 amount);

    // New events
    event RoleGranted(bytes32 role, address account);
    event RoleRevoked(bytes32 role, address account);
    event PriceUpdated(uint256 indexed productId, uint256 newPrice);
    event BatchCreated(string batchId, uint256[] productIds);
    event TransportInfoUpdated(uint256 indexed productId, uint256 transportIndex, TransportStatus status);

    // New role constants
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant QUALITY_INSPECTOR_ROLE = keccak256("QUALITY_INSPECTOR_ROLE");

    modifier onlyAdmin() {
        require(admins[msg.sender], "Caller is not an admin");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(roles[role][msg.sender], "Caller does not have the required role");
        _;
    }

    constructor() {
        admins[msg.sender] = true;
        _grantRole(FARMER_ROLE, msg.sender);
    }

    function addAdmin(address _newAdmin) public onlyAdmin {
        admins[_newAdmin] = true;
    }

    function removeAdmin(address _admin) public onlyAdmin {
        require(_admin != msg.sender, "Cannot remove self as admin");
        admins[_admin] = false;
    }

    function grantRole(bytes32 _role, address _account) public onlyAdmin {
        roles[_role][_account] = true;
        emit RoleGranted(_role, _account);
    }

    function revokeRole(bytes32 _role, address _account) public onlyAdmin {
        roles[_role][_account] = false;
        emit RoleRevoked(_role, _account);
    }

    // Modified function to use new role system
    function registerActor(address _actorAddress, string memory _name, string memory _role) public onlyAdmin {
        require(!actors[_actorAddress].isRegistered, "Actor already registered");
        actors[_actorAddress] = Actor(true, _name, _role);
        
        bytes32 roleHash = keccak256(abi.encodePacked(_role));
        grantRole(roleHash, _actorAddress);
        
        emit ActorRegistered(_actorAddress, _name, _role);
    }

    // New internal function for price updates
    function _updatePrice(uint256 _productId, uint256 _newPrice) internal {
        Product storage product = products[_productId];
        product.price = _newPrice;
        product.priceHistory.push(PriceHistory(block.timestamp, _newPrice));
        emit PriceUpdated(_productId, _newPrice);
    }

    // New internal function for product creation
    function _createProduct(string memory _name, uint256 _quantity, uint256 _price, string memory _originFarm, string memory _batchId) internal returns (uint256) {
        productCount++;
        Product storage newProduct = products[productCount];
        newProduct.id = productCount;
        newProduct.name = _name;
        newProduct.quantity = _quantity;
        newProduct.currentOwner = msg.sender;
        newProduct.status = ProductStatus.Created;
        newProduct.originFarm = _originFarm;
        newProduct.harvestDate = block.timestamp;
        newProduct.batchId = _batchId;

        _updatePrice(productCount, _price);

        emit ProductCreated(productCount, _name, msg.sender);
        return productCount;
    }

    // Refactored createProduct function
    function createProduct(string memory _name, uint256 _quantity, uint256 _price, string memory _originFarm) public onlyRole(FARMER_ROLE) {
        _createProduct(_name, _quantity, _price, _originFarm, "");
    }

    // Refactored createProductBatch function (replaces both createBatchProducts and createProductBatch)
    function createProductBatch(string memory _batchId, string[] memory _names, uint256[] memory _quantities, uint256[] memory _prices, string memory _originFarm) public onlyRole(FARMER_ROLE) {
        require(_names.length == _quantities.length && _quantities.length == _prices.length, "Input arrays must have the same length");
        
        uint256[] memory productIds = new uint256[](_names.length);
        
        for (uint i = 0; i < _names.length; i++) {
            productIds[i] = _createProduct(_names[i], _quantities[i], _prices[i], _originFarm, _batchId);
        }
        
        emit BatchCreated(_batchId, productIds);
    }

    // Refactored updateProductPrice function
    function updateProductPrice(uint256 _productId, uint256 _newPrice) public {
        require(products[_productId].currentOwner == msg.sender, "Only current owner can update the price");
        _updatePrice(_productId, _newPrice);
    }

    // New internal function for product transfer
    function _transferProduct(uint256 _productId, address _from, address _to) internal {
        require(products[_productId].currentOwner == _from, "Only current owner can transfer the product");
        require(actors[_to].isRegistered, "Recipient is not a registered actor");

        products[_productId].currentOwner = _to;
        emit ProductTransferred(_productId, _from, _to);
    }

    // Refactored transferProduct function
    function transferProduct(uint256 _productId, address _newOwner) public {
        require(actors[msg.sender].isRegistered, "Actor is not registered");
        _transferProduct(_productId, msg.sender, _newOwner);
    }

    // Refactored processPayment function
    function processPayment(uint256 _productId) public payable {
        Product storage product = products[_productId];
        require(product.status == ProductStatus.ForSale, "Product is not for sale");
        require(msg.value == product.price * product.quantity, "Incorrect payment amount");

        address payable seller = payable(product.currentOwner);
        seller.transfer(msg.value);

        _transferProduct(_productId, seller, msg.sender);
        updateProductStatus(_productId, ProductStatus.Sold);

        emit PaymentProcessed(msg.sender, seller, msg.value);
    }

    function updateProductStatus(uint256 _productId, ProductStatus _newStatus) public {
        require(products[_productId].currentOwner == msg.sender, "Only current owner can update the product status");
        products[_productId].status = _newStatus;
        emit ProductStatusUpdated(_productId, _newStatus);
    }

    // Modified function to use new role system
    function performQualityCheck(uint256 _productId, string memory _notes, bool _passed) public onlyRole(QUALITY_INSPECTOR_ROLE) {
        Product storage product = products[_productId];
        product.qualityCheckCount++;
        product.qualityChecks[product.qualityCheckCount] = QualityCheck(msg.sender, block.timestamp, _notes, _passed);
        emit QualityCheckPerformed(_productId, msg.sender, _passed);

        if (!_passed) {
            product.status = ProductStatus.Rejected;
            emit ProductStatusUpdated(_productId, ProductStatus.Rejected);
        }
    }

    function getProductDetails(uint256 _productId) public view returns (
        string memory name,
        uint256 quantity,
        uint256 price,
        address currentOwner,
        ProductStatus status,
        string memory originFarm,
        uint256 harvestDate,
        uint256 qualityCheckCount
    ) {
        Product storage product = products[_productId];
        return (
            product.name,
            product.quantity,
            product.price,
            product.currentOwner,
            product.status,
            product.originFarm,
            product.harvestDate,
            product.qualityCheckCount
        );
    }

    function getQualityCheck(uint256 _productId, uint256 _checkId) public view returns (
        address inspector,
        uint256 date,
        string memory notes,
        bool passed
    ) {
        QualityCheck memory check = products[_productId].qualityChecks[_checkId];
        return (check.inspector, check.date, check.notes, check.passed);
    }

    // New function to get price history
    function getPriceHistory(uint256 _productId) public view returns (uint256[] memory timestamps, uint256[] memory prices) {
        PriceHistory[] storage history = products[_productId].priceHistory;
        uint256 length = history.length;
        
        timestamps = new uint256[](length);
        prices = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            timestamps[i] = history[i].timestamp;
            prices[i] = history[i].price;
        }
        
        return (timestamps, prices);
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
    }

    // New function for batch operations
    function setProductExpiration(uint256 _productId, uint256 _expirationDate) public {
        require(products[_productId].currentOwner == msg.sender, "Only current owner can set expiration date");
        products[_productId].expirationDate = _expirationDate;
        emit ProductExpirationSet(_productId, _expirationDate);
    }

    // New function for product recall
    function recallProduct(uint256 _productId, string memory _reason) public {
        require(hasRole(FARMER_ROLE, msg.sender) || hasRole(PROCESSOR_ROLE, msg.sender), "Must have farmer or processor role to recall product");
        products[_productId].status = ProductStatus.Recalled;
        emit ProductRecalled(_productId, msg.sender, _reason);
    }

    // New function for reporting issues
    function reportIssue(uint256 _productId, string memory _description) public {
        require(actors[msg.sender].isRegistered, "Must be a registered actor to report issues");
        issues[_productId].push(Issue(msg.sender, block.timestamp, _description));
        emit IssueReported(_productId, msg.sender, _description);
    }

    // Add these new events and structs
    event ProductExpirationSet(uint256 indexed productId, uint256 expirationDate);
    event ProductRecalled(uint256 indexed productId, address indexed recalledBy, string reason);
    event IssueReported(uint256 indexed productId, address indexed reportedBy, string description);

    struct Issue {
        address reportedBy;
        uint256 timestamp;
        string description;
    }

    // Add these new mappings and variables to the contract
    mapping(uint256 => Issue[]) public issues;

    // New struct for transportation information
    struct TransportInfo {
        address carrier;
        uint256 departureTime;
        uint256 estimatedArrivalTime;
        uint256 actualArrivalTime;
        string sourceLocation;
        string destinationLocation;
        TransportStatus status;
    }

    // New enum for transport status
    enum TransportStatus { Pending, InTransit, Delivered, Delayed }

    mapping(uint256 => TransportInfo[]) public productTransportHistory;

    // New function to add transport information
    function addTransportInfo(uint256 _productId, address _carrier, uint256 _estimatedArrivalTime, string memory _sourceLocation, string memory _destinationLocation) public {
        require(hasRole(DISTRIBUTOR_ROLE, msg.sender) || hasRole(RETAILER_ROLE, msg.sender), "Must have distributor or retailer role to add transport info");
        require(products[_productId].currentOwner == msg.sender, "Only current owner can add transport info");
        
        TransportInfo memory newTransport = TransportInfo({
            carrier: _carrier,
            departureTime: block.timestamp,
            estimatedArrivalTime: _estimatedArrivalTime,
            actualArrivalTime: 0,
            sourceLocation: _sourceLocation,
            destinationLocation: _destinationLocation,
            status: TransportStatus.Pending
        });
        
        productTransportHistory[_productId].push(newTransport);
        emit TransportInfoUpdated(_productId, productTransportHistory[_productId].length - 1, TransportStatus.Pending);
    }

    // New function to update transport status
    function updateTransportStatus(uint256 _productId, uint256 _transportIndex, TransportStatus _newStatus) public {
        require(hasRole(DISTRIBUTOR_ROLE, msg.sender) || hasRole(RETAILER_ROLE, msg.sender), "Must have distributor or retailer role to update transport status");
        require(_transportIndex < productTransportHistory[_productId].length, "Invalid transport index");
        
        TransportInfo storage transport = productTransportHistory[_productId][_transportIndex];
        transport.status = _newStatus;
        
        if (_newStatus == TransportStatus.Delivered) {
            transport.actualArrivalTime = block.timestamp;
        }
        
        emit TransportInfoUpdated(_productId, _transportIndex, _newStatus);
    }

    // New function to get transport information
    function getTransportInfo(uint256 _productId, uint256 _transportIndex) public view returns (
        address carrier,
        uint256 departureTime,
        uint256 estimatedArrivalTime,
        uint256 actualArrivalTime,
        string memory sourceLocation,
        string memory destinationLocation,
        TransportStatus status
    ) {
        require(_transportIndex < productTransportHistory[_productId].length, "Invalid transport index");
        TransportInfo storage transport = productTransportHistory[_productId][_transportIndex];
        return (
            transport.carrier,
            transport.departureTime,
            transport.estimatedArrivalTime,
            transport.actualArrivalTime,
            transport.sourceLocation,
            transport.destinationLocation,
            transport.status
        );
    }

    // New struct for Farm
    struct Farm {
        string name;
        address owner;
        bool isRegistered;
    }

    // New struct for Shipment
    struct Shipment {
        uint256 id;
        uint256[] productIds;
        address farm;
        address currentOwner;
        ShipmentStatus status;
    }

    // New enum for Shipment status
    enum ShipmentStatus { Created, InTransit, Delivered, Rejected }

    // New mappings
    mapping(address => Farm) public farms;
    mapping(uint256 => Shipment) public shipments;
    uint256 public shipmentCount;

    // New events
    event FarmRegistered(address indexed farmAddress, string name);
    event ShipmentCreated(uint256 indexed shipmentId, address indexed farm, uint256[] productIds);
    event ShipmentStatusUpdated(uint256 indexed shipmentId, ShipmentStatus status);

    // New function to register a farm
    function registerFarm(string memory _name) public {
        require(!farms[msg.sender].isRegistered, "Farm already registered");
        farms[msg.sender] = Farm(_name, msg.sender, true);
        emit FarmRegistered(msg.sender, _name);
    }

    // New function to create a shipment
    function createShipment(uint256[] memory _productIds) public {
        require(farms[msg.sender].isRegistered, "Must be a registered farm to create shipment");
        require(hasRole(FARMER_ROLE, msg.sender), "Must have farmer role to create shipment");
        
        shipmentCount++;
        Shipment storage newShipment = shipments[shipmentCount];
        newShipment.id = shipmentCount;
        newShipment.productIds = _productIds;
        newShipment.farm = msg.sender;
        newShipment.currentOwner = msg.sender;
        newShipment.status = ShipmentStatus.Created;

        for (uint i = 0; i < _productIds.length; i++) {
            require(products[_productIds[i]].currentOwner == msg.sender, "You must own all products in the shipment");
        }

        emit ShipmentCreated(shipmentCount, msg.sender, _productIds);
    }

    // New function to update shipment status
    function updateShipmentStatus(uint256 _shipmentId, ShipmentStatus _newStatus) public {
        require(shipments[_shipmentId].currentOwner == msg.sender, "Only current owner can update the shipment status");
        shipments[_shipmentId].status = _newStatus;
        emit ShipmentStatusUpdated(_shipmentId, _newStatus);
    }

    // New function to transfer shipment
    function transferShipment(uint256 _shipmentId, address _newOwner) public {
        require(shipments[_shipmentId].currentOwner == msg.sender, "Only current owner can transfer the shipment");
        require(actors[_newOwner].isRegistered, "Recipient must be a registered actor");

        Shipment storage shipment = shipments[_shipmentId];
        shipment.currentOwner = _newOwner;

        // Transfer all products in the shipment
        for (uint i = 0; i < shipment.productIds.length; i++) {
            _transferProduct(shipment.productIds[i], msg.sender, _newOwner);
        }

        emit ShipmentStatusUpdated(_shipmentId, ShipmentStatus.InTransit);
    }

    // New function to get shipment details
    function getShipmentDetails(uint256 _shipmentId) public view returns (
        uint256 id,
        uint256[] memory productIds,
        address farm,
        address currentOwner,
        ShipmentStatus status
    ) {
        Shipment storage shipment = shipments[_shipmentId];
        return (
            shipment.id,
            shipment.productIds,
            shipment.farm,
            shipment.currentOwner,
            shipment.status
        );
    }
}