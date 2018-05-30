/*
* PredictionExchange is an exchange contract that doesn't accept bets on the outcomes,
* but instead matchedes backers/takers (those betting on odds) with layers/makers 
* (those offering the odds).
*
* Code conventions:
*       - side: 0 (unknown), 1 (support), 2 (against)
*       - role: 0 (unknown), 1 (maker), 2 (taker)
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

        function shake(uint hid, uint role, uint side, uint payout, address maker, bytes32 offchain) public payable {
                Market storage m = markets[hid];
                require(now < m.closingTime);
                if (role == 1) {
                        m.open[msg.sender][side].stake += msg.value;
                        m.open[msg.sender][side].payout += payout;
                } else if (role == 2) {

                        // move maker's order from open to matched (could be partial)
                        require(maker != 0);
                        m.matched[maker][3-side].stake += (payout - msg.value);
                        m.matched[maker][3-side].payout += payout;
                        m.open[maker][3-side].stake -= (payout - msg.value);
                        m.open[maker][3-side].payout -= payout;
                        require(m.open[maker][3-side].stake >= 0);
                        require(m.open[maker][3-side].payout >= 0);

                        // add taker's order to matched
                        m.matched[msg.sender][side].stake += msg.value;
                        m.matched[msg.sender][side].payout += payout;

                }
                __shake(hid, offchain);
        }

        event __unshake(uint hid, bytes32 offchain);

        // unshake() limitation: depends on offchain to calc payout
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
                uint amt = 0;
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
