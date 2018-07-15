pragma solidity ^0.4.24;

import "./Token.sol";

contract TokenRegistry {
    
    event NewTokenAdded(address tokenAddress, string symbol, string name, uint8 decimals, bytes32 offchain);
    event TokenDeleted(address tokenAddress);
    
    struct TokenMetadata {
        address tokenAddress;
        string symbol;
        string name;
        uint8 decimals;
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
    
    function addNewToken(address _tokenAddr, string _symbol, string _name, uint8 _decimals, bytes32 offchain) public onlyOwner {
        TokenMetadata memory tokenData = TokenMetadata({
            tokenAddress: _tokenAddr,
            symbol: _symbol,
            name: _name,
            decimals: _decimals
        });
        
        tokenMapping[_tokenAddr] = tokenData;
        tokens.push(_tokenAddr);
        
        emit NewTokenAdded(_tokenAddr, _symbol, _name, _decimals, offchain);
    }
    
    function transferToken(address _tokenAddr, address _from, address _to, uint256 _amount) public returns(bool) {
        return Token(_tokenAddr).transferFrom(_from, _to, _amount);
    }
    
    function removeToken(address _tokenAddr) public onlyOwner {
        require(tokenIsExisted(_tokenAddr));
        delete tokenMapping[_tokenAddr];
        for (uint i = 0; i < tokens.length; i++) {
            if(tokens[i] == _tokenAddr) {
                delete tokens[i];
            }
        }
        emit TokenDeleted(_tokenAddr);
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
        for(uint256 i = 0; i < tokens.length; i++) {
            if(tokens[i] == _tokenAddr) {
                return true;
            }
        }
        return false;
    }

    function getBalanceOf(address _tokenAddress, address _userAddress) public view returns (uint) {
        return Token(_tokenAddress).balanceOf(_userAddress);
    }
}