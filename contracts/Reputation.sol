pragma solidity ^0.4.18;

contract Reputation {

        mapping(address => uint) public score;
        mapping(address => uint) public nRatings;

        event __add(uint score);

        // TODO: anyone can add rating?
        function add(address user, uint rating) public {
                nRatings[user]++;
                score[user] = nRatings[user] == 0? rating: 
                        (score[user] * (nRatings[user]-1) + rating) / nRatings[user];
                                                            
                __add(score[user]);
        }
}
