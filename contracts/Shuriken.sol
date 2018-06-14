pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Shuriken is StandardToken {

        uint public INITIAL_SUPPLY = 27000000;

        string public constant name = "Shuriken";
        string public constant symbol = "SHURI";
        uint8 public constant decimals = 18;

        constructor() public {
                totalSupply_ = INITIAL_SUPPLY * (10 ** decimals);
                balances[msg.sender] = totalSupply_;
        }
}
