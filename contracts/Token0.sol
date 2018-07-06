pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Token0 is StandardToken {

        uint public INITIAL_SUPPLY = 100000000;

        string public constant name = "Token 0";
        string public constant symbol = "TKN0";
        uint public constant decimals = 0;

        constructor() public {
                totalSupply_ = INITIAL_SUPPLY * (10 ** decimals);
                balances[msg.sender] = totalSupply_;
        }
}
