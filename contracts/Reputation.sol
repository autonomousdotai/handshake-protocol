pragma solidity ^0.4.18;

contract Reputation {

        mapping(address => uint) public score;
        mapping(address => uint) public nRatings;

        // TODO: anyone can add rating?
        function add(address user, uint rating) public {
                score[user] = nRatings[user] == 0? rating: 
                        (score[user] * nRatings[user] + rating) / (nRatings[user] + 1);
                nRatings[user]++;
        }
}
