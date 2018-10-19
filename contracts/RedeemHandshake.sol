pragma solidity ^0.4.24;

contract RedeemHandshake {

    struct Redeem {
        address creator;
        uint stake;
    }

    address public root;
    Redeem[] public redeems;

    modifier onlyRoot() {
        require(msg.sender == root);
        _;
    }

    constructor() public {
        root = msg.sender;
    } 

    event __initRedeem(uint rid, bytes32 offchain);

    function initRedeem(uint amount, uint fee, bytes32 offchain) 
        public 
        payable
    {
        require(msg.value == amount + (amount * fee) / 100);
        Redeem memory r;
        r.creator = msg.sender;
        r.stake = amount;
        redeems.push(r);

        root.transfer((amount * fee) / 100);
        emit __initRedeem(redeems.length - 1, offchain);
    }


    event __useRedeem(uint rid, bytes32 offchain);

    function useRedeem(uint rid, uint amount, address receiver, bytes32 offchain) 
        public
        onlyRoot
    {
        require(receiver != address(0x0));
        
        Redeem storage r = redeems[rid];
        require(r.stake >= amount);
        
        r.stake -= amount;
        receiver.transfer(amount);
        emit __useRedeem(rid, offchain);
    }
}