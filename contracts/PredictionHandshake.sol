pragma solidity ^0.4.18;

/*
*
* outcome: 0 (unknown), 1 (true), 2 (false)
*
*
*/

contract PredictionHandshake {

        struct Prediction {
                uint outcome;
                uint stake;
                uint possibleWinnings;
        }

        enum S { Inited, Shaked, Closed, Cancelled, InitiatorWon, PredictionWon, Draw, Accepted, Rejected, Done }

        struct Market {
                address initiator;
                uint backBalance; // bet for the outcome
                uint layBalance; // bet against the outcome
                uint deadline;
                uint odds;
                uint8 outcome;
                S state;
                mapping(address => Prediction) predictionOf;
        }

        Market[] public markets;
        address public root;
        uint public reviewWindow = 3 days;
        uint public rejectWindow = 1 days;

        function PredictionHandshake() public {
                root = msg.sender;
        } 

        modifier onlyInitiator(uint hid) {
                require(msg.sender == markets[hid].initiator);
                _;
        }

        modifier onlyPrediction(uint hid) {
                require(markets[hid].predictionOf[msg.sender].stake != 0);
                _;
        }

        modifier initiatorOrPredictions(uint hid) {
                require(markets[hid].predictionOf[msg.sender].stake != 0 || msg.sender == markets[hid].initiator);
                _;
        }

        modifier onlyRoot() {
                require(msg.sender == root);
                _;
        }

        event __init(uint hid, bytes32 offchain); 

        function init(uint deadline, uint odds, bytes32 offchain) public payable {
                Market memory m;
                m.initiator = msg.sender;
                m.deadline = now + deadline * 1 seconds;
                m.odds = odds;
                m.state = S.Inited;
                markets.push(m);

                __init(markets.length - 1, offchain);
        }

        event __shake(uint hid, bytes32 offchain);

        function shake(uint hid, uint outcome, bytes32 offchain) public payable {
                Market storage m = markets[hid];

                require(now < m.deadline);
                require(m.state == S.Inited || m.state == S.Shaked);
                if (m.predictionOf[msg.sender].stake == 0)
                        m.predictionOf[msg.sender].outcome = outcome;
                else
                        require(m.predictionOf[msg.sender].outcome == outcome);

                m.predictionOf[msg.sender].stake += msg.value;

                if (outcome == 1)
                        m.predictionOf[msg.sender].possibleWinnings += msg.value;
                else if (outcome == 2)
                        m.predictionOf[msg.sender].possibleWinnings += msg.value * m.odds;

                m.backBalance += msg.value;
                m.state = S.Shaked;

                __shake(hid, offchain);
        }

        /*

        event __closeMarket(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain);

        // Initiator close bet
        function closeMarket(uint hid, bytes32 offchain) public onlyInitiator(hid) {
                Market storage b = markets[hid];
                require(b.backBalance < b.goal);
                if (b.predictors.length == 0 && b.state == S.Inited) {
                        msg.sender.transfer(b.escrow);
                        b.escrow = 0; 
                        b.state = S.Closed;

                } else if(b.state == S.Shaked) {
                        uint remainingMoney = b.escrow - ((b.backBalance * b.escrow) / b.goal);
                        b.escrow -= remainingMoney;
                        b.goal = b.backBalance;
                        msg.sender.transfer(remainingMoney);
                }

                __closeMarket(hid, b.state, b.backBalance, b.escrow, offchain);
        }

        event __initiatorWon(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain); 

        function initiatorWon(uint hid, bytes32 offchain) public initiatorOrPredictions(hid) {
                Market storage b = markets[hid]; 
                require(b.state == S.Shaked && now > b.deadline * 1 seconds); 
                b.state = S.InitiatorWon; 

                __initiatorWon(hid, b.state, b.backBalance, b.escrow, offchain);
        }

        event __betorWon(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain); 

        function betorWon(uint hid, bytes32 offchain) public initiatorOrPredictions(hid) {
                Market storage b = markets[hid]; 
                require(b.state == S.Shaked && now > b.deadline * 1 seconds);
                b.state = S.PredictionWon;

                __betorWon(hid, b.state, b.backBalance, b.escrow, offchain);
        }

        event __draw(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain); 

        function draw(uint hid, bytes32 offchain) public initiatorOrPredictions(hid) {
                Market storage b = markets[hid]; 
                require(b.state == S.Shaked && now > b.deadline * 1 seconds); 
                b.state = S.Draw;

                __draw(hid, b.state, b.backBalance, b.escrow, offchain);
        }

        event __reject(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain);

        function reject(uint hid, bytes32 offchain) public initiatorOrPredictions(hid) {
                Market storage b = markets[hid]; 
                require(b.state == S.InitiatorWon || b.state == S.Draw || b.state == S.PredictionWon); 

                b.state = S.Rejected;
                __reject(hid, b.state, b.backBalance, b.escrow, offchain);
        }

        */

        event __withdraw(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain);

        function withdraw(uint hid, bytes32 offchain) public initiatorOrPredictions(hid) {
                Market storage b = markets[hid]; 
                if (b.state != S.Accepted) {
                        if(b.state == S.Cancelled) {
                                b.outcome = uint8(S.Draw);
                        } else {
                                require(now > b.deadline + rejectWindow);
                                if (b.state == S.InitiatorWon || b.state == S.PredictionWon || b.state == S.Draw) {
                                        b.outcome = uint8(b.state);
                                }
                        }
                        b.state = S.Accepted;
                }
                require(b.state == S.Accepted);
                if (b.outcome == uint8(S.InitiatorWon)) {
                        if(b.initiator == msg.sender && b.escrow > 0) {
                                b.initiator.transfer(b.escrow + b.backBalance);
                                b.escrow = 0;
                                b.backBalance = 0;
                        }

                } else if (b.outcome == uint8(S.PredictionWon)) {
                        if (b.predictionOf[msg.sender].stake > 0) {
                                if(b.backBalance > 0) {
                                        Prediction storage p = b.predictionOf[msg.sender];
                                        b.escrow -= p.possibleWinnings;
                                        b.backBalance -= p.stake;
                                        msg.sender.transfer(p.possibleWinnings);
                                        p.stake = 0;
                                        p.possibleWinnings = 0;
                                }
                        }

                } else if (b.outcome == uint8(S.Draw)) { 
                        if(b.initiator == msg.sender && b.escrow > 0) {
                                b.initiator.transfer(b.escrow);
                                b.escrow = 0;

                        } else if (b.predictionOf[msg.sender].stake > 0) {
                                if(b.backBalance > 0) {
                                        Prediction storage p1 = b.predictionOf[msg.sender];
                                        b.backBalance -= p1.stake;
                                        msg.sender.transfer(p1.stake);
                                        p1.stake = 0;
                                        p1.possibleWinnings = 0;
                                }
                        }
                }

                if (b.backBalance == 0 && b.escrow == 0) {
                        b.state = S.Done;   
                }

                __withdraw(hid, b.state, b.backBalance, b.escrow, offchain);
        }


        event __setWinner(uint hid, S state, uint backBalance, uint escrow, bytes32 offchain);

        // root will set the winner if there is a dispute    
        function setWinner(uint hid, uint8 outcome, bytes32 offchain) public onlyRoot() {
                Market storage b = markets[hid];
                require(b.state == S.Rejected && (outcome == uint8(S.InitiatorWon) || outcome == uint8(S.Draw) || outcome == uint8(S.PredictionWon)));
                b.state = S.Accepted;
                b.outcome = outcome;
                __setWinner(hid, b.state, b.backBalance, b.escrow, offchain);
        }

        function possibleWinnings(uint hid) public view returns (uint) {
                Market storage b = markets[hid];
                if (msg.sender == b.initiator) {
                        return b.backBalance;
                }
                return b.predictionOf[msg.sender].possibleWinnings;
        }
}
