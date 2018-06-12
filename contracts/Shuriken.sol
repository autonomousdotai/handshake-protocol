pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Shuriken is StandardToken {

        string public symbol = "SRK";
        string public name = "Shuriken";
        uint public INITIAL_SUPPLY = 27000000;

        constructor() public {
                totalSupply_ = INITIAL_SUPPLY;
                balances[msg.sender] = INITIAL_SUPPLY;
        }
}
