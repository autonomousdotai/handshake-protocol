pragma solidity ^0.4.24;

import "./Token.sol";

contract TokenRegistry {

    struct TokenMetadata {
        address tokenAddress;
        string symbol;
        string name;
        uint8 decimals;
        bool valid;
    }
    
    mapping(address => TokenMetadata) public tokenMapping;
    address[] public tokens;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    constructor() public {
        owner = msg.sender;
    }
    
    event __addNewToken(uint tid, bytes32 offchain);

    function addNewToken(address _tokenAddr, string _symbol, string _name, uint8 _decimals, bytes32 offchain) public {
        TokenMetadata memory tokenData = TokenMetadata({
            tokenAddress: _tokenAddr,
            symbol: _symbol,
            name: _name,
            decimals: _decimals,
            valid: true
        });
        
        tokenMapping[_tokenAddr] = tokenData;
        tokens.push(_tokenAddr);
        
        emit __addNewToken(tokens.length - 1, offchain);
    }
    
    function transferToken(address _tokenAddr, address _from, address _to, uint256 _amount) public returns(bool) {
        return Token(_tokenAddr).transferFrom(_from, _to, _amount);
    }
    
    function getTokenByAddr(address _tokenAddr) public view returns 
    (
        string,
        string,
        uint8
    ) {
        TokenMetadata storage tokenData = tokenMapping[_tokenAddr];
        return (tokenData.symbol, tokenData.name, tokenData.decimals);
    }
    
    function tokenIsExisted(address _tokenAddr) public view returns (bool) {
        TokenMetadata storage tokenMetadata = tokenMapping[_tokenAddr];
        return tokenMetadata.valid;
    }

    function getBalanceOf(address _tokenAddress, address _userAddress) public view returns (uint) {
        return Token(_tokenAddress).balanceOf(_userAddress);
    }
}