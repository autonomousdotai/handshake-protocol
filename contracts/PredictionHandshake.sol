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
*       state: 0 (unknown), 1 (created), 2 (approved), 3 (reported), 4 (disputed)
*       __test__* events will be removed prior to production deployment
*
*/

pragma solidity ^0.4.24;

contract PredictionHandshake {

        struct Order {
                uint stake;
                uint payout;
        }

        struct Market {
                address creator;
                uint closingTime; 
                uint winningFee; 
                uint reportTime; 
                uint reportFee;
                bytes32 source;
                address reporter;
                uint disputeTime;

                uint state;
                uint outcome;
                uint totalStakes;
                uint disputeStakes;
                bool resolved;

                mapping(address => mapping(uint => Order)) open; // address => side => order
                mapping(address => mapping(uint => Order)) matched; // address => side => order
        }

        Market[] public markets;
        address public root;
        uint public NETWORK_FEE = 20; // 20%

        constructor() public {
                root = msg.sender;
        } 

        event __initMarket(uint hid, bytes32 offchain); 

        function initMarket(
                uint closingWindow, 
                uint winningFee, 
                uint reportWindow, 
                uint reportFee,
                bytes32 source,
                address reporter, 
                uint disputeWindow,
                bytes32 offchain
        ) 
                public 
        {
                Market memory m;
                m.creator = msg.sender;
                m.closingTime = now + closingWindow * 1 seconds;
                m.winningFee = winningFee;
                m.reportTime = m.closingTime + reportWindow * 1 seconds;
                m.reportFee = reportFee;
                m.source = source;
                m.reporter = reporter;
                m.disputeTime = m.reportTime + disputeWindow * 1 seconds;
                m.state = 1;
                markets.push(m);

                emit __initMarket(markets.length - 1, offchain);
        }


        event __shakeMarket(uint hid, bytes32 offchain); 

        function shakeMarket(uint hid, bytes32 offchain) public {
                Market storage m = markets[hid];

                require(msg.sender == m.reporter);

                m.state = 2;

                emit __shakeMarket(hid, offchain);
        }

        event __initOrder(uint hid, bytes32 offchain);
        event __test__initOrder(uint hid, uint stake, uint payout, bytes32 offchain);

        // market maker
        function initOrder(uint hid, uint side, uint payout, bytes32 offchain) public payable {
                Market storage m = markets[hid];

                require(now < m.closingTime);
                require(m.state == 2);

                m.open[msg.sender][side].stake += msg.value;
                m.open[msg.sender][side].payout += payout;

                emit __initOrder(hid, offchain);
                emit __test__initOrder(hid, m.open[msg.sender][side].stake, m.open[msg.sender][side].payout, offchain);
        }

        event __uninitOrder(uint hid, bytes32 offchain);
        event __test__uninitOrder(uint hid, uint stake, uint payout, bytes32 offchain);

        // market maker cancels order
        function uninitOrder(uint hid, uint side, uint stake, uint payout, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid];

                require(m.state == 2);
                require(m.open[msg.sender][side].stake >= stake);
                require(m.open[msg.sender][side].payout >= payout);

                m.open[msg.sender][side].stake -= stake;
                m.open[msg.sender][side].payout -= payout;

                msg.sender.transfer(stake);

                emit __uninitOrder(hid, offchain);
                emit __test__uninitOrder(hid, m.open[msg.sender][side].stake, m.open[msg.sender][side].payout, offchain);
        }

        event __shakeOrder(uint hid, bytes32 offchain);
        event __test__shakeOrder__taker(uint hid, uint stake, uint payout, bytes32 offchain);
        event __test__shakeOrder__maker(uint hid, uint matched_stake, uint matched_payout, 
                                           uint open_stake, uint open_payout, bytes32 offchain);

        // market taker
        function shakeOrder(
                uint hid, 
                uint side, 
                uint payout, 
                address maker, 
                bytes32 offchain
        ) 
                public 
                payable 
        {
                Market storage m = markets[hid];

                require(maker != 0);
                require(m.state == 2);
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

                m.totalStakes += payout;

                emit __shakeOrder(hid, offchain);

                emit __test__shakeOrder__taker(hid, m.matched[msg.sender][side].stake, 
                                             m.matched[msg.sender][side].payout, offchain);
                emit __test__shakeOrder__maker(hid, m.matched[maker][3-side].stake, m.matched[maker][3-side].payout, m.open[maker][3-side].stake, m.open[maker][3-side].payout, offchain);
        }


        event __collect(uint hid, bytes32 offchain);
        event __test__collect(uint network, uint market, uint trader);

        // collect payouts & outstanding stakes (if there is outcome)
        function collect(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 

                require(m.state == 3);
                require(now > m.disputeTime);

                // calc network commission, market commission and winnings
                uint marketComm = (m.matched[msg.sender][m.outcome].payout * m.winningFee) / 100;
                uint networkComm = (marketComm * NETWORK_FEE) / 100;
                uint amt = m.matched[msg.sender][m.outcome].payout;

                amt += m.open[msg.sender][1].stake; 
                amt += m.open[msg.sender][2].stake;

                require(amt > 0);

                // wipe data
                m.matched[msg.sender][m.outcome].payout = 0;
                m.open[msg.sender][1].stake = 0; 
                m.open[msg.sender][2].stake = 0;

                msg.sender.transfer(amt - marketComm);
                m.creator.transfer(marketComm - networkComm);
                root.transfer(networkComm);

                emit __collect(hid, offchain);
                emit __test__collect(networkComm, marketComm - networkComm, amt - marketComm);
        }


        event __refund(uint hid, bytes32 offchain);

        // refund stakes when market closes (if there is no outcome)
        function refund(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 

                require(m.state == 2);
                require(now > m.reportTime);

                // calc refund amt
                uint amt;
                amt += m.matched[msg.sender][1].stake;
                amt += m.matched[msg.sender][2].stake;
                amt += m.open[msg.sender][1].stake;
                amt += m.open[msg.sender][2].stake;

                require(amt > 0);

                // wipe data
                m.matched[msg.sender][1].stake = 0;
                m.matched[msg.sender][2].stake = 0;
                m.open[msg.sender][1].stake = 0;
                m.open[msg.sender][2].stake = 0;

                msg.sender.transfer(amt);

                emit __refund(hid, offchain);
        }


        event __report(uint hid, bytes32 offchain);

        // report outcome
        function report(uint hid, uint outcome, bytes32 offchain) public {
                Market storage m = markets[hid]; 
                require(m.state == 2);
                require(msg.sender == m.reporter);
                m.outcome = outcome;
                m.state = 3;
                emit __report(hid, offchain);
        }


        event __dispute(uint hid, bytes32 offchain);

        // dispute outcome
        function dispute(uint hid, bytes32 offchain) public {
                Market storage m = markets[hid]; 
                require(m.state == 3);
                require(!m.resolved);
                m.disputeStakes += m.matched[msg.sender][m.outcome].stake;

                // if dispute stakes > 5% of the total stakes
                if (100 * m.disputeStakes > 5 * m.totalStakes) {
                        m.state = 4;
                }
                emit __dispute(hid, offchain);
        }


        event __resolve(uint hid, bytes32 offchain);

        function resolve(uint hid, uint outcome, bytes32 offchain) public {
                require(msg.sender == root);
                Market storage m = markets[hid]; 
                require(m.state == 4);
                m.resolved = true;
                m.outcome = outcome;
                m.state = outcome == 0? 2: 3;
                emit __resolve(hid, offchain);
        }


        modifier onlyPredictor(uint hid) {
                require(markets[hid].matched[msg.sender][1].stake > 0 || 
                        markets[hid].matched[msg.sender][2].stake > 0 || 
                        markets[hid].open[msg.sender][1].stake > 0 || 
                        markets[hid].open[msg.sender][2].stake > 0);
                _;
        }
}
