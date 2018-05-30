pragma solidity ^0.4.18;

contract ExchangeHandshake {

    enum S { Inited, Shaked, Accepted, Rejected, Done, Cancelled }

    struct Exchange {
        address coinOwner;
        address cashOwner;
        address exchanger;
        address initiatorFeeBack;
        uint fee;
        uint feeBack;
        uint value;
        S state;
    }

    Exchange[] public ex;

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

    modifier atState(S _s, uint hid) {
        require(_s == ex[hid].state);
        _;
    }



    /**
    * @dev Initiate handshake by cashOwner
    * @param exchanger exchanger address
    * @param initiatorFeeBack initiatorFeeBack address
    * @param value funds required for this handshake
    * @param offchain record ID in offchain backend database
    */
    function init(
        address exchanger,
        address initiatorFeeBack,
        uint value,
        bytes32 offchain
    )
        public
    {
        Exchange memory p;
        p.cashOwner = msg.sender;
        p.exchanger = exchanger;
        p.initiatorFeeBack = initiatorFeeBack;
        p.value = value;
        //todo set fee
        //p.fee = fee;
        //p.feeBack = feeBack;
        p.state = S.Inited;
        ex.push(p);
        __init(ex.length - 1, msg.sender, offchain);
    }

    /**
    * @dev Initiate handshake by CoinOwner
    */
    function initByCoinOwner(
        address exchanger,
        address initiatorFeeBack,
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
        p.initiatorFeeBack = initiatorFeeBack;
        p.value = value;
        //todo set fee
        //p.fee = fee;
        //p.feeBack = feeBack;
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
}
