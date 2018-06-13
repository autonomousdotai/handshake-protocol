pragma solidity ^0.4.24;

contract ExchangeShop {

    address owner;

    constructor() public {
        owner = msg.sender;
    }
    uint fee = 0;// 0%

    enum S { Inited, Shaked, Rejected, Cancelled,Done }

    struct Exchange {
        address shopOwner;
        address customer;
        uint escrow;
        S state;
    }

    Exchange[] public ex;
    event __setFee(uint fee);

    event __initByShopOwner(uint hid, address shopOwner, uint value,bytes32 offchain);
    event __closeByShopOwner(uint hid, bytes32 offchain);
    event __releasePartialFund(uint hid,address customer,uint amount,bytes32 offchainP,bytes32 offchainC);


    event __initByCustomer(uint hid, address customer, address shopOwner, uint value,bytes32 offchain);
    event __cancel(uint hid, bytes32 offchain);
    event __shake(uint hid, bytes32 offchain);
    event __reject(uint hid, bytes32 offchain);
    event __finish(uint hid, bytes32 offchain);


    //success if sender is shopOwner
    modifier onlyShopOwner(uint hid) {
        require(msg.sender == ex[hid].shopOwner);
        _;
    }

    //success if sender is customer
    modifier onlyCustomer(uint hid) {
        require(msg.sender == ex[hid].customer);
        _;
    }


    //success if sender is shopOwner or customer
    modifier onlyShopOwnerOrCustomer(uint hid) {
        require(msg.sender == ex[hid].shopOwner || msg.sender == ex[hid].customer);
        _;
    }

    //success if sender is owner
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier atState(S _s, uint hid) {
        require(_s == ex[hid].state);
        _;
    }

    /**
        * @dev Initiate exchange fee by owner
        * @param f exchange fee
        */
    function setFee(
        uint f
    )
        public
        onlyOwner()
    {
        fee = f;
        emit __setFee(fee);
    }
    /**
    * @dev Initiate handshake by shopOwner
    * @param offchain record ID in offchain backend database
    */
    function initByShopOwner(
        bytes32 offchain
    )
        public
        payable
    {
        require(msg.value > 0);
        Exchange memory p;
        p.shopOwner = msg.sender;
        p.escrow = msg.value;
        p.state = S.Inited;
        ex.push(p);
        emit __initByShopOwner(ex.length - 1, msg.sender, msg.value, offchain);
    }

    //CashOwner close the transaction after init
    function closeByShopOwner(uint hid, bytes32 offchain) public onlyShopOwner(hid)
        atState(S.Inited, hid)
    {
        Exchange storage p = ex[hid];
        p.state = S.Cancelled;
        msg.sender.transfer(p.escrow);
        p.escrow = 0;
        emit __closeByShopOwner(hid, offchain);
    }

    //CoinOwner releaseFundByShopOwner transaction
    function releasePartialFund(uint hid,address customer,uint amount, bytes32 offchainP, bytes32 offchainC) public onlyShopOwner(hid)
        atState(S.Inited, hid)
    {
        require(customer != 0x0 && amount > 0);
        Exchange storage p = ex[hid];
        uint f = (amount * fee) / 1000;
        uint t = amount + f;
        require(p.escrow >= t);
        p.escrow -= t;
        owner.transfer(f);
        p.customer.transfer(amount);
        if (p.escrow == 0) p.state = S.Done;
        emit __releasePartialFund(hid,customer, amount, offchainP, offchainC);
    }

     //get handshake balance by hid
     function getBalance(uint hid) public constant returns(uint){
        Exchange storage p = ex[hid];
        return p.escrow;
     }

    /**
    * @dev Initiate handshake by Customer
    */
    function initByCustomer(
        address shopOwner,
        bytes32 offchain
    )
        public
        payable
    {
        require(msg.value > 0);
        Exchange memory p;
        p.customer = msg.sender;
        p.shopOwner = shopOwner;
        p.escrow = msg.value;
        p.state = S.Inited;
        ex.push(p);
        emit __initByCustomer(ex.length - 1, msg.sender,shopOwner,msg.value, offchain);
    }


    //coinOwner cancel the handshake
    function cancel(uint hid, bytes32 offchain) public
        onlyShopOwnerOrCustomer(hid)
        atState(S.Inited, hid)
    {
        Exchange storage p = ex[hid];
        p.state = S.Cancelled;
        msg.sender.transfer(p.escrow);
        p.escrow = 0;
        emit __cancel(hid, offchain);
    }

    //shopOwner agree and make a handshake
    function shake(uint hid, bytes32 offchain) public
        onlyShopOwner(hid)
        atState(S.Inited, hid)
    {
        require(ex[hid].customer != 0x0);
        ex[hid].state = S.Shaked;
        emit __shake(hid, offchain);

    }

    //customer finish transaction for sending the coin to shopOwner
    function finish(uint hid, bytes32 offchain) public onlyCustomer(hid)
        atState(S.Shaked, hid)
    {
        Exchange storage p = ex[hid];
        require(p.escrow > 0);

        uint f = (p.escrow * fee) / 1000;

        p.shopOwner.transfer(p.escrow-f);
        owner.transfer(f);
        p.escrow = 0;
        p.state = S.Done;
        emit __finish(hid, offchain);
    }


    //CashOwner reject the transaction
    function reject(uint hid, bytes32 offchain) public
        onlyShopOwnerOrCustomer(hid)
    {
        Exchange storage p = ex[hid];
        p.state = S.Rejected;
        p.customer.transfer(p.escrow);
        p.escrow = 0;
        emit __reject(hid, offchain);
    }

    //get handshake stage by hid
     function getState(uint hid) public constant returns(uint8){
        Exchange storage p = ex[hid];
        return uint8(p.state);
     }

}
