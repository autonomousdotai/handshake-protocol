pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract Token1 is StandardToken {

        uint public INITIAL_SUPPLY = 100000000;

        string public constant name = "Token 1";
        string public constant symbol = "TKN1";
        uint public constant decimals = 1;

        constructor() public {
                totalSupply_ = INITIAL_SUPPLY * (10 ** decimals);
                balances[msg.sender] = totalSupply_;
        }
}
