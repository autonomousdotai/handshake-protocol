pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Shuriken is StandardToken {

        uint public INITIAL_SUPPLY = 27000000;

        constructor() public {
                totalSupply_ = INITIAL_SUPPLY;
                balances[msg.sender] = totalSupply_;
        }
}
