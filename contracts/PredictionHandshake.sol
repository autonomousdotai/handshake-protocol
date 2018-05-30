/*
*
* PredictionExchange is an exchange contract that doesn't accept bets on the outcomes,
* but instead matchedes backers/takers (those betting on odds) with layers/makers 
* (those offering the odds).
*
* Conventions:
*
*       side: 0 (unknown), 1 (support), 2 (against)
*       role: 0 (unknown), 1 (maker), 2 (taker)
*       __debug__* events will be removed prior to production deployment
*
*/

pragma solidity ^0.4.18;

contract PredictionHandshake {

        struct Order {
                uint stake;
                uint payout;
        }

        struct Market {
                address initiator;
                uint closingTime; 
                uint outcome;
                mapping(address => mapping(uint => Order)) open; // address => side => order
                mapping(address => mapping(uint => Order)) matched; // address => side => order
        }

        Market[] public markets;
        address public root;

        uint public REPORT_WINDOW = 4 hours;

        function PredictionHandshake() public {
                root = msg.sender;
        } 

        event __init(uint hid, bytes32 offchain); 

        function init(uint closingTime, bytes32 offchain) public payable {
                Market memory m;
                m.initiator = msg.sender;
                m.closingTime = now + closingTime * 1 seconds;
                markets.push(m);
                __init(markets.length - 1, offchain);
        }

        event __shake(uint hid, bytes32 offchain);

        event __debug__shakeByMaker(uint hid, uint stake, uint payout, bytes32 offchain);

        function shakeByMaker(uint hid, uint side, uint payout, bytes32 offchain) public payable {
                Market storage m = markets[hid];
                require(now < m.closingTime);
                m.open[msg.sender][side].stake += msg.value;
                m.open[msg.sender][side].payout += payout;
                __shake(hid, offchain);
                __debug__shakeByMaker(hid, m.open[msg.sender][side].stake, m.open[msg.sender][side].payout, offchain);
        }

        event __debug__shakeByTaker__taker(uint hid, uint stake, uint payout, bytes32 offchain);
        event __debug__shakeByTaker__maker(uint hid, uint matched_stake, uint matched_payout, 
                                           uint open_stake, uint open_payout, bytes32 offchain);

        function shakeByTaker(uint hid, uint side, uint payout, address maker, bytes32 offchain) public payable {
                require(maker != 0);
                Market storage m = markets[hid];
                require(now < m.closingTime);

                // move maker's order from open (could be partial)
                m.open[maker][3-side].stake -= (payout - msg.value);
                m.open[maker][3-side].payout -= payout;
                require(m.open[maker][3-side].stake >= 0);
                require(m.open[maker][3-side].payout >= 0);

                // add taker's order maker's order to matched
                m.matched[maker][3-side].stake += (payout - msg.value);
                m.matched[maker][3-side].payout += payout;
                m.matched[msg.sender][side].stake += msg.value;
                m.matched[msg.sender][side].payout += payout;

                __shake(hid, offchain);

                __debug__shakeByTaker__taker(hid, m.matched[msg.sender][side].stake, 
                                             m.matched[msg.sender][side].payout, offchain);
                __debug__shakeByTaker__maker(hid, m.matched[maker][3-side].stake, m.matched[maker][3-side].payout, 
                                             m.open[maker][3-side].stake, m.open[maker][3-side].payout, offchain);
        }

        event __unshake(uint hid, bytes32 offchain);

        function unshake(uint hid, uint side, uint stake, uint payout, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid];
                require(m.open[msg.sender][side].stake >= stake);
                require(m.open[msg.sender][side].payout >= payout);
                m.open[msg.sender][side].stake -= stake;
                m.open[msg.sender][side].payout -= payout;
                __unshake(hid, offchain);
        }

        event __withdraw(uint hid, bytes32 offchain);

        function withdraw(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 
                require(now > m.closingTime);
                uint amt;
                if (m.outcome != 0) {

                        // calc pmt
                        amt += m.matched[msg.sender][m.outcome].payout;
                        amt += m.open[msg.sender][1].stake; 
                        amt += m.open[msg.sender][2].stake;

                        // wipe pmt data
                        m.matched[msg.sender][m.outcome].payout = 0;
                        m.open[msg.sender][1].stake = 0; 
                        m.open[msg.sender][2].stake = 0;

                        msg.sender.transfer(amt);

                } else if (now > m.closingTime + REPORT_WINDOW) {

                        // calc pmt
                        amt += m.matched[msg.sender][1].stake;
                        amt += m.matched[msg.sender][2].stake;
                        amt += m.open[msg.sender][1].stake;
                        amt += m.open[msg.sender][2].stake;

                        // wipe pmt data
                        m.matched[msg.sender][1].stake = 0;
                        m.matched[msg.sender][2].stake = 0;
                        m.open[msg.sender][1].stake = 0;
                        m.open[msg.sender][2].stake = 0;

                        msg.sender.transfer(amt);

                }
                __withdraw(hid, offchain);
        }

        event __report(uint hid, bytes32 offchain);

        function report(uint hid, uint outcome, bytes32 offchain) public onlyRoot() {
                markets[hid].outcome = outcome;
                __report(hid, offchain);
        }

        modifier onlyPredictor(uint hid) {
                require(markets[hid].matched[msg.sender][1].stake > 0 || 
                        markets[hid].matched[msg.sender][2].stake > 0 || 
                        markets[hid].open[msg.sender][1].stake > 0 || 
                        markets[hid].open[msg.sender][2].stake > 0);
                _;
        }

        modifier onlyRoot() {
                require(msg.sender == root);
                _;
        }
}
