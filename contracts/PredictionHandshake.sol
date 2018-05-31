/*
*
* PredictionExchange is an exchange contract that doesn't accept bets on the outcomes,
* but instead matchedes backers/takers (those betting on odds) with layers/makers 
* (those offering the odds).
*
* Note:
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
                address creator;
                uint outcome;
                uint fee;
                uint reportTime;
                uint closingTime; 
                mapping(address => mapping(uint => Order)) open; // address => side => order
                mapping(address => mapping(uint => Order)) matched; // address => side => order
        }

        Market[] public markets;
        address public root;

        function PredictionHandshake() public {
                root = msg.sender;
        } 

        event __createMarket(uint hid, bytes32 offchain); 

        function createMarket(uint fee, uint closingTime, uint reportTime, bytes32 offchain) public payable {
                Market memory m;
                m.creator = msg.sender;
                m.fee = fee;
                m.closingTime = now + closingTime * 1 seconds;
                m.reportTime = m.closingTime + reportTime * 1 seconds;
                markets.push(m);
                __createMarket(markets.length - 1, offchain);
        }

        event __init(uint hid, bytes32 offchain);
        event __debug__init(uint hid, uint stake, uint payout, bytes32 offchain);

        function init(uint hid, uint side, uint payout, bytes32 offchain) public payable {
                Market storage m = markets[hid];
                require(now < m.closingTime);
                m.open[msg.sender][side].stake += msg.value;
                m.open[msg.sender][side].payout += payout;
                __init(hid, offchain);
                __debug__init(hid, m.open[msg.sender][side].stake, m.open[msg.sender][side].payout, offchain);
        }

        event __uninit(uint hid, bytes32 offchain);

        function uninit(uint hid, uint side, uint stake, uint payout, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid];
                require(m.open[msg.sender][side].stake >= stake);
                require(m.open[msg.sender][side].payout >= payout);
                m.open[msg.sender][side].stake -= stake;
                m.open[msg.sender][side].payout -= payout;
                msg.sender.transfer(stake);
                __uninit(hid, offchain);
        }

        event __shake(uint hid, bytes32 offchain);
        event __debug__shake__taker(uint hid, uint stake, uint payout, bytes32 offchain);
        event __debug__shake__maker(uint hid, uint matched_stake, uint matched_payout, 
                                           uint open_stake, uint open_payout, bytes32 offchain);

        function shake(uint hid, uint side, uint payout, address maker, bytes32 offchain) public payable {
                require(maker != 0);
                Market storage m = markets[hid];
                require(now < m.closingTime);

                // remove maker's order from open (could be partial)
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

                __debug__shake__taker(hid, m.matched[msg.sender][side].stake, 
                                             m.matched[msg.sender][side].payout, offchain);
                __debug__shake__maker(hid, m.matched[maker][3-side].stake, m.matched[maker][3-side].payout, 
                                             m.open[maker][3-side].stake, m.open[maker][3-side].payout, offchain);
        }


        event __collect(uint hid, bytes32 offchain);

        // collect winning payout
        function collect(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 
                require(m.outcome != 0);
                require(now > m.closingTime);

                // calc market commission & winning amount
                uint com = m.matched[msg.sender][m.outcome].payout * m.fee / 100;
                uint amt = m.matched[msg.sender][m.outcome].payout - com;
                amt += m.open[msg.sender][1].stake; 
                amt += m.open[msg.sender][2].stake;

                // wipe data
                m.matched[msg.sender][m.outcome].payout = 0;
                m.open[msg.sender][1].stake = 0; 
                m.open[msg.sender][2].stake = 0;

                msg.sender.transfer(amt);
                root.transfer(com);

                __collect(hid, offchain);
        }


        event __refund(uint hid, bytes32 offchain);

        // refund when market closes and there is no outcome
        function refund(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 
                require(m.outcome == 0);
                require(now > m.reportTime);

                // calc refund amt
                uint amt;
                amt += m.matched[msg.sender][1].stake;
                amt += m.matched[msg.sender][2].stake;
                amt += m.open[msg.sender][1].stake;
                amt += m.open[msg.sender][2].stake;

                // wipe data
                m.matched[msg.sender][1].stake = 0;
                m.matched[msg.sender][2].stake = 0;
                m.open[msg.sender][1].stake = 0;
                m.open[msg.sender][2].stake = 0;

                msg.sender.transfer(amt);

                __refund(hid, offchain);
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
