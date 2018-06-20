pragma solidity ^0.4.24;

contract ExchangeHandshake {

    address owner;

     constructor() public {
        owner = msg.sender;
    }
    uint fee = 0;

    enum S { Inited, Shaked, Accepted, Rejected, Done, Cancelled }

    struct Exchange {
        address coinOwner;
        address cashOwner;
        address exchanger;
        uint fee; //percentage
        uint value;
        S state;
    }

    Exchange[] public ex;

    event __setFee(uint fee);
    event __initByCoinOwner(uint hid, address coinOwner, bytes32 offchain);
    event __initByCashOwner(uint hid, address cashOwner, bytes32 offchain);
    event __shake(uint hid,uint amount, bytes32 offchain);
    event __withdraw(uint hid, uint value, bytes32 offchain);
    event __reject(uint hid, bytes32 offchain);
    event __accept(uint hid, bytes32 offchain);
    event __cancel(uint hid, bytes32 offchain);
    event __closeByCashOwner(uint hid, bytes32 offchain);

    //success if sender is coinOwner
    modifier onlyCoinOwner(uint hid) {
        require(msg.sender == ex[hid].coinOwner);
        _;
    }

    //success if sender is cashOwner
    modifier onlyCashOwner(uint hid) {
        require(msg.sender == ex[hid].cashOwner);
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
    * @dev Initiate handshake by cashOwner
    * @param exchanger exchanger address
    * @param value funds required for this handshake
    * @param offchain record ID in offchain backend database
    */
    function initByCashOwner(
        address exchanger,
        uint value,
        bytes32 offchain
    )
        public
    {
        Exchange memory p;
        p.cashOwner = msg.sender;
        p.exchanger = exchanger;
        p.value = value;
        p.fee = fee;
        p.state = S.Inited;
        ex.push(p);
        emit __initByCashOwner(ex.length - 1, msg.sender, offchain);
    }

    /**
    * @dev Initiate handshake by CoinOwner
    */
    function initByCoinOwner(
        address exchanger,
        bytes32 offchain
    )
        public
        payable
    {
        require(msg.value >= 0);
        Exchange memory p;
        p.coinOwner = msg.sender;
        p.exchanger = exchanger;
        p.value = msg.value;
        p.fee = fee;
        p.state = S.Inited;
        ex.push(p);
        emit __initByCoinOwner(ex.length - 1, msg.sender, offchain);
    }

    //CashOwner close the transaction after init
    function closeByCashOwner(uint hid, bytes32 offchain) public onlyCashOwner(hid)
        atState(S.Inited, hid)
    {
        ex[hid].state = S.Cancelled;
        emit __closeByCashOwner(hid, offchain);
    }

    //shaker agree and make a handshake
    function shake(uint hid, bytes32 offchain) public payable
        atState(S.Inited, hid)
    {
        if (ex[hid].coinOwner == 0x0 && msg.value >= ex[hid].value) ex[hid].coinOwner = msg.sender;

        if (ex[hid].cashOwner == 0x0) ex[hid].cashOwner = msg.sender;

        require(msg.sender == ex[hid].coinOwner || msg.sender == ex[hid].cashOwner);
        ex[hid].state = S.Shaked;
        emit __shake(hid, msg.value, offchain);

    }

    //CoinOwner accept transaction
    function accept(uint hid, bytes32 offchain) public onlyCoinOwner(hid)
        atState(S.Shaked, hid)
    {
        Exchange storage p = ex[hid];
        p.state = S.Accepted;
        emit __accept(hid, offchain);
    }

    //CashOwner withdraw funds from a handshake
    function withdraw(uint hid, bytes32 offchain) public onlyCashOwner(hid)
        atState(S.Accepted, hid)
    {
       Exchange storage p = ex[hid];
       p.state = S.Done;
       uint f = (p.value * p.fee) / 1000;
       p.exchanger.transfer(f);
       msg.sender.transfer(p.value - f);
       p.value = 0;

        emit __withdraw(hid,p.value, offchain);
    }

    //CashOwner reject the transaction
    function reject(uint hid, bytes32 offchain) public onlyCashOwner(hid)
        atState(S.Shaked, hid)
    {
        ex[hid].state = S.Rejected;
        emit __reject(hid, offchain);
    }

    //coinOwner cancel the handshake
    function cancel(uint hid, bytes32 offchain) public onlyCoinOwner(hid) {
        Exchange storage p = ex[hid];
        require(p.state == S.Rejected
                || p.state == S.Shaked || p.state == S.Inited);
        p.state = S.Cancelled;
        msg.sender.transfer(p.value);
        p.value = 0;
        emit __cancel(hid, offchain);
    }

    //get handshake stage by hid
     function getState(uint hid) public constant returns(uint8){
        Exchange storage p = ex[hid];
        return uint8(p.state);
     }

}
