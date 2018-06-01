pragma solidity ^0.4.18;

contract Reputation {

        mapping(address => uint) public rating;
        mapping(address => uint) public numRatings;
        mapping(address => bool) public approved;
        address public root;

        function Reputation() public {
                root = msg.sender;
        }

        function rate(address a, uint _rating) onlyApproved public {
                rating[a] = (rating[a] * numRatings[a] + _rating) / (numRatings[a] + 1);
                numRatings[a]++;
        }

        function approve(address a) public onlyRoot returns (bool) {
                approved[a] = true;
        }

        function disapprove(address a) public onlyRoot returns (bool) {
                approved[a] = false;
        }

        modifier onlyRoot() { require(msg.sender == root); _; }
        modifier onlyApproved() { require(approved[msg.sender]); _; }
}
