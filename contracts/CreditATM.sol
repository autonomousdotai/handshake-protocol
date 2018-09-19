pragma solidity ^0.4.24;

contract CreditATM {

    address owner;

    constructor() public {
        owner = msg.sender;
        addAdmin(owner);
    }

    struct Exchange {
        address sender;
        uint percentage;
        uint escrow;
    }

    Exchange[] public ex;
    address[] public ad;

    event __addAdmin(uint length, address ad);
    event __rAdmin(uint length, address ad);
    event __deposit(uint hid, address stationOwner, uint value,uint percentage, bytes32 offchain);
    event __releasePartialFund(address customer,uint amount,bytes32 offchain);


    //success if sender is owner
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    //success if sender is owner
    modifier onlyAdmin() {
        bool isAdmin = false;
        for (uint i = 0; i < ad.length; i++) {
            if(msg.sender == ad[i]){
                isAdmin = true;
                break;
            }
        }
        require(isAdmin);
        _;
    }

    /**
    * @dev add admin
    * @param a is the admin address
    */
    function addAdmin(
        address a
    )
        public
        onlyOwner()
    {
        require(a != 0x0 );
        bool isUnique = true;
        for (uint i = 0; i < ad.length; i++) {
            if(a == ad[i]){
                isUnique = false;
                break;
            }
        }
        require(isUnique);
        ad.push(a);
        emit __addAdmin(ad.length - 1, a);
    }

     /**
    * @dev remove admin
    * @param a is the admin address
    */
    function rAdmin(
        address a
    )
        public
        onlyOwner()
    {
        require(a != 0x0 );
        for (uint i = 0; i < ad.length; i++) {
            if(a == ad[i]){
                delete ad[i];
                ad.length--;
                break;
            }
        }

        emit __rAdmin(ad.length - 1, a);
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
    function releasePartialFund(address customer,uint amount, bytes32 offchain) public onlyAdmin()
    {
        require(customer != 0x0 && amount > 0);
        customer.transfer(amount);
        emit __releasePartialFund(customer, amount, offchain);
    }

    //get deposit info by hid
    function getDepositList(uint hid) public constant returns(address, uint, uint ){
        Exchange storage p = ex[hid];
        return (p.sender, p.escrow, p.percentage);
    }

}
