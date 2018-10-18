pragma solidity ^0.4.25;

contract RedeemHandshake {

    struct Redeem {
        address creator;
        uint stake;
    }

    address public root;
    Redeem[] public redeems;
    mapping(bytes32 => address) public receivers;

    modifier onlyRoot() {
        require(msg.sender == root);
        _;
    }

    constructor() public {
        root = msg.sender;
    } 

    event __initRedeem(uint rid, bytes32 offchain);

    function initRedeem(uint amount, bytes32[] codes, uint fee, bytes32 offchain) 
        public 
        payable
        onlyRoot
    {
        require(msg.value == amount + (amount * fee) / 100);
        Redeem memory r;
        r.creator = msg.sender;
        r.stake = amount;
        redeems.push(r);

        for (uint index = 0; index < codes.length; index++) {
            receivers[codes[index]] = address(0x0);
        }
        root.transfer((amount * fee) / 100);
        emit __initRedeem(redeems.length - 1, offchain);
    }


    event __useRedeem(uint rid, bytes32 offchain);

    function useRedeem(uint rid, bytes32 redeem, uint amount, address receiver, bytes32 offchain) 
        public
        onlyRoot
    {
        require(receivers[redeem] == address(0x0) && receiver != address(0x0));
        
        Redeem storage r = redeems[rid];
        require(r.stake >= amount);
        
        r.stake -= amount;
        receiver.transfer(amount);
        receivers[redeem] = receiver;
        emit __useRedeem(rid, offchain);
    }
}