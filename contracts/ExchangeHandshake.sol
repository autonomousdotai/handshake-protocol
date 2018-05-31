pragma solidity ^0.4.18;

contract ExchangeHandshake {

    address owner;

    function ExchangeHandshake() public {
    	owner = msg.sender;
	}
    uint fee;
    uint feeRefund;

    enum S { Inited, Shaked, Accepted, Rejected, Done, Cancelled }

    struct Exchange {
        address coinOwner;
        address cashOwner;
        address exchanger;
        address adrFeeRefund;
        uint fee; //percentage
        uint feeRefund;//percentage
        uint value;
        S state;
    }

    Exchange[] public ex;

    event __setFee(uint fee, uint feeRefund);
    event __init(uint hid, address initiator, bytes32 offchain);
    event __shake(uint hid, bytes32 offchain);
    event __withdraw(uint hid, bytes32 offchain);
    event __reject(uint hid, bytes32 offchain);
    event __accept(uint hid, bytes32 offchain);
    event __cancel(uint hid, bytes32 offchain);

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
        * @param fr %fee send back to initiator
        */
    function setFee(
        uint f,
        uint fr
    )
        public
        onlyOwner()
    {
        fee = f;
        feeRefund = fr;
        __setFee(fee, feeRefund);
    }


    /**
    * @dev Initiate handshake by cashOwner
    * @param exchanger exchanger address
    * @param adrFeeRefund adrFeeRefund address
    * @param value funds required for this handshake
    * @param offchain record ID in offchain backend database
    */
    function init(
        address exchanger,
        address adrFeeRefund,
        uint value,
        bytes32 offchain
    )
        public
    {
        Exchange memory p;
        p.cashOwner = msg.sender;
        p.exchanger = exchanger;
        p.adrFeeRefund = adrFeeRefund;
        p.value = value;
        p.fee = fee;
        p.feeRefund = feeRefund;
        p.state = S.Inited;
        ex.push(p);
        __init(ex.length - 1, msg.sender, offchain);
    }

    /**
    * @dev Initiate handshake by CoinOwner
    */
    function initByCoinOwner(
        address exchanger,
        address adrFeeRefund,
        uint value,
        bytes32 offchain
    )
        public
        payable
    {
        require(msg.value >= value);
        Exchange memory p;
        p.coinOwner = msg.sender;
        p.exchanger = exchanger;
        p.adrFeeRefund = adrFeeRefund;
        p.value = value;
        p.fee = fee;
        p.feeRefund = feeRefund;
        p.state = S.Inited;
        ex.push(p);
        __init(ex.length - 1, msg.sender, offchain);
    }

    //shaker agree and make a handshake
    function shake(uint hid, bytes32 offchain) public payable
        atState(S.Inited, hid)
    {
        if (ex[hid].coinOwner == 0x0 && msg.value >= ex[hid].value) ex[hid].coinOwner = msg.sender;

        if (ex[hid].cashOwner == 0x0) ex[hid].cashOwner = msg.sender;

        require(msg.sender == ex[hid].coinOwner || msg.sender == ex[hid].cashOwner);
        __shake(hid, offchain);
        ex[hid].state = S.Shaked;
    }

    //CoinOwner accept transaction
    function accept(uint hid, bytes32 offchain) public onlyCoinOwner(hid)
        atState(S.Shaked, hid)
    {
        Exchange storage p = ex[hid];
        p.state = S.Accepted;
        __accept(hid, offchain);
    }

    //CashOwner withdraw funds from a handshake
    function withdraw(uint hid, bytes32 offchain) public onlyCashOwner(hid)
        atState(S.Accepted, hid)
    {
        Exchange storage p = ex[hid];
        p.state = S.Done;
        uint f = (p.value * p.fee) / 1000;
        uint fr = (p.value * p.feeRefund) / 1000;
        p.exchanger.transfer(f);
        p.adrFeeRefund.transfer(fr);
        msg.sender.transfer(p.value - f - fr);

        __withdraw(hid, offchain);
    }

    //CashOwner reject the transaction
    function reject(uint hid, bytes32 offchain) public onlyCashOwner(hid)
        atState(S.Shaked, hid)
    {
        ex[hid].state = S.Rejected;
        __reject(hid, offchain);
    }

    //coinOwner cancel the handshake
    function cancel(uint hid, bytes32 offchain) public onlyCoinOwner(hid) {
        Exchange storage p = ex[hid];
        require(p.state == S.Rejected
                || p.state == S.Shaked);
        p.state = S.Cancelled;
        msg.sender.transfer(p.value);

        __cancel(hid, offchain);
    }

    //get handshake stage by hid
     function getState(uint hid) public constant returns(uint8){
        Exchange storage p = ex[hid];
        return uint8(p.state);
     }

}
