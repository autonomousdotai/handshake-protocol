pragma solidity ^0.4.24;

contract CreditATM {

    address owner;

    constructor() public {
        owner = msg.sender;
    }

    struct Exchange {
        address sender;
        uint percentage;
        uint escrow;
    }

    Exchange[] public ex;

    event __deposit(uint hid, address stationOwner, uint value,uint percentage, bytes32 offchain);
    event __releasePartialFund(uint hid,address customer,uint amount,bytes32 offchain);


    //success if sender is owner
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /**
    * @dev deposit coin to escrow
    * @param offchain record ID in offchain backend database
    */
    function deposit(
        bytes32 offchain,
        uint percentage
    )
        public
        payable
    {
        require(msg.value > 0);
        Exchange memory p;
        p.sender = msg.sender;
        p.escrow = msg.value;
        p.percentage = percentage;
        ex.push(p);
        emit __deposit(ex.length - 1, msg.sender, msg.value, percentage, offchain);
    }


    //Owner releaseFundByStationOwner transaction
    function releasePartialFund(uint hid,address customer,uint amount, bytes32 offchain) public onlyOwner()
    {
        require(customer != 0x0 && amount > 0);
        customer.transfer(amount);
        emit __releasePartialFund(hid,customer, amount, offchain);
    }

    //get deposit info by hid
    function getDepositList(uint hid) public constant returns(address, uint, uint ){
        Exchange storage p = ex[hid];
        return (p.sender, p.escrow, p.percentage);
    }

}
