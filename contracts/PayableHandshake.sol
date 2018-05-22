pragma solidity ^0.4.18;


/**
 * @title PayableHandshake
 * @author Autonomous
 * @dev PayableHandshake allows payer to send funds for a handshake and payee withdraw funds if their deliver is accepted
 */
contract PayableHandshake {

    enum S { Inited, Shaked, Accepted, Rejected, Done, Cancelled }

    struct Payable {
        address payee;
        address payer;
        uint value;
        S state;
        uint deadline;
    }

    uint public reviewWindow = 7 days;
    uint public resolveWindow = 14 days;

    Payable[] public pm;

    /**
    * Events
    * @param hid ID of the handshake
    * @param offchain record ID in offchain backend database (help us retrieve user information)
    * @param payee address of the handshake's payee
    * @param payer address of the handshake's payer
    */
    event __init(uint hid, address payee, address payer, bytes32 offchain);
    event __shake(uint hid, bytes32 offchain);
    event __deliver(uint hid, bytes32 offchain);
    event __withdraw(uint hid, bytes32 offchain);
    event __reject(uint hid, bytes32 offchain);
    event __accept(uint hid, bytes32 offchain);
    event __cancel(uint hid, bytes32 offchain);

    //success if sender is payee
    modifier onlyPayee(uint hid) {
        require(msg.sender == pm[hid].payee);
        _;
    }

    //success if sender is payer
    modifier onlyPayer(uint hid) {
        require(msg.sender == pm[hid].payer);
        _;
    }

    /**
    * @dev Initiate handshake by Payee
    * @param payer payer address
    * @param value funds required for this handshake
    * @param deadline deadline for this handshake
    * @param offchain record ID in offchain backend database
    */
    function init(
        address payer,
        uint value,
        uint deadline,
        bytes32 offchain
    )
        public
    {
        Payable memory p;
        p.payee = msg.sender;
        p.payer = payer;
        p.value = value;
        p.deadline = now + deadline * 1 seconds;
        pm.push(p);
        __init(pm.length - 1, msg.sender, payer, offchain);
    }

    /**
    * @dev Initiate handshake by Payer
    * @param payee payee address
    */
    function initByPayer(
        address payee,
        uint value,
        uint deadline, // in seconds
        bytes32 offchain
    )
        public
        payable
    {
        require(msg.value >= value);
        Payable memory p;
        p.payee = payee;
        p.payer = msg.sender;
        p.value = value;
        p.state = S.Shaked;
        p.deadline = now + deadline * 1 seconds;
        pm.push(p);
        __init(pm.length - 1, payee, msg.sender, offchain);
        __shake(pm.length - 1, offchain);
    }

    //Payer agree and make a handshake
    function shake(uint hid, bytes32 offchain) public payable {
        require(pm[hid].state == S.Inited && msg.value >= pm[hid].value);
        if (pm[hid].payer == 0x0) pm[hid].payer = msg.sender;
        require(msg.sender == pm[hid].payer);
        __shake(hid, offchain);
        pm[hid].state = S.Shaked;
    }

    //Payee delivered item
    function deliver(uint hid, bytes32 offchain) public onlyPayee(hid) {
        Payable storage p = pm[hid];
        require(p.state == S.Shaked && now < p.deadline);
        p.state = S.Accepted;
        __deliver(hid, offchain);
    }

    //Payee withdraw funds from a handshake
    function withdraw(uint hid, bytes32 offchain) public onlyPayee(hid) {
        Payable storage p = pm[hid];
        require(p.state == S.Accepted && now >= p.deadline + reviewWindow);
        p.state = S.Done;

        msg.sender.transfer(p.value);
        __withdraw(hid, offchain);
    }

    //Payer reject the deliver
    function reject(uint hid, bytes32 offchain) public onlyPayer(hid) {
        require(pm[hid].state == S.Accepted);
        pm[hid].state = S.Rejected;
        __reject(hid, offchain);
    }

    //Payer accept the deliver
    function accept(uint hid, bytes32 offchain) public onlyPayer(hid) {
        require(pm[hid].state == S.Rejected);
        pm[hid].state = S.Accepted;
        __accept(hid, offchain);
    }

    //Payer cancel the handshake
    function cancel(uint hid, bytes32 offchain) public onlyPayer(hid) {
        Payable storage p = pm[hid];
        require((p.state == S.Rejected && now >= p.deadline + reviewWindow + resolveWindow)
                || (p.state == S.Shaked && now >= p.deadline));

        p.state = S.Cancelled;
        msg.sender.transfer(p.value);
        __cancel(hid, offchain);
    }
}
