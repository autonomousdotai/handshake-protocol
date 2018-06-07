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
*       __test__* events will be removed prior to production deployment
*       odds are rounded up (2.25 is 225)
*
*/

pragma solidity ^0.4.24;

contract PredictionHandshake {

        struct Order {
                uint stake;
                uint payout;
                mapping(uint => uint) odds; // odds => size
        }

        struct Market {
                address creator;
                address reporter;
                uint outcome;
                uint fee;
                uint closingTime; 
                uint reportTime;
                mapping(address => mapping(uint => Order)) open; // address => side => order
                mapping(address => mapping(uint => Order)) matched; // address => side => order
        }

        Market[] public markets;
        address public root;
        uint public NETWORK_FEE = 20; // 20%
        uint public ODDS_ROUND_UP = 100; // 2.25 is 225 

        constructor() public {
                root = msg.sender;
        } 

        event __createMarket(uint hid, bytes32 offchain); 

        function createMarket(
                uint fee, 
                address reporter, 
                uint closingTime, 
                uint reportTime, 
                bytes32 offchain
        ) 
                public 
        {
                Market memory m;
                m.creator = msg.sender;
                m.reporter = reporter;
                m.fee = fee;
                m.closingTime = now + closingTime * 1 seconds;
                m.reportTime = m.closingTime + reportTime * 1 seconds;
                markets.push(m);
                emit __createMarket(markets.length - 1, offchain);
        }

        event __init(uint hid, bytes32 offchain);
        event __test__init(uint hid, uint stake, uint payout, bytes32 offchain);

        // market maker
        function init(uint hid, uint side, uint odds, bytes32 offchain) public payable {
                Market storage m = markets[hid];
                require(now < m.closingTime);
                m.open[msg.sender][side].stake += msg.value;
                m.open[msg.sender][side].odds[odds] += msg.value;
                m.open[msg.sender][side].payout += ((odds * msg.value) / ODDS_ROUND_UP);
                emit __init(hid, offchain);
                emit __test__init(hid, m.open[msg.sender][side].stake, m.open[msg.sender][side].payout, offchain);
        }

        event __uninit(uint hid, bytes32 offchain);
        event __test__uninit(uint hid, uint stake, uint payout, bytes32 offchain);

        // market maker cancels order
        function uninit(uint hid, uint side, uint stake, uint odds, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid];
                require(m.open[msg.sender][side].stake >= stake);
                require(m.open[msg.sender][side].odds[odds] >= stake);
                m.open[msg.sender][side].stake -= stake;
                m.open[msg.sender][side].odds[odds] -= stake;
                m.open[msg.sender][side].payout -= ((odds * stake) / ODDS_ROUND_UP);
                msg.sender.transfer(stake);
                emit __uninit(hid, offchain);
                emit __test__uninit(hid, m.open[msg.sender][side].stake, m.open[msg.sender][side].payout, offchain);
        }

        event __shake(uint hid, bytes32 offchain);
        event __test__shake__taker(uint hid, uint stake, uint payout, bytes32 offchain);
        event __test__shake__maker(uint hid, uint matched_stake, uint matched_payout, 
                                           uint open_stake, uint open_payout, bytes32 offchain);

        // market taker
        function shake(uint hid, uint side, uint takerOdds, address maker, uint makerOdds, bytes32 offchain) public payable {
                require(maker != 0);
                Market storage m = markets[hid];
                require(now < m.closingTime);

                address taker = msg.sender;
                uint takerStake = msg.value;
                uint takerPayout = (takerStake * takerOdds) / ODDS_ROUND_UP;

                uint makerStake = msg.value * takerOdds - takerStake;
                uint makerPayout = (makerStake * makerOdds) / ODDS_ROUND_UP;

                // check if the odds matching is valid
                require(makerOdds >= takerOdds * (makerOdds -1));

                // remove maker's order from open (could be partial)
                m.open[maker][3-side].stake -= makerStake;
                m.open[maker][3-side].odds[makerOdds] -= makerStake;
                m.open[maker][3-side].payout -= makerPayout;

                // check if the stake is sufficient
                require(m.open[maker][3-side].stake >= 0);
                require(m.open[maker][3-side].odds[makerOdds] >= 0);
                require(m.open[maker][3-side].payout >= 0);

                // add taker's order maker's order to matched
                m.matched[maker][3-side].stake += makerStake;
                m.matched[maker][3-side].odds[makerOdds] += makerStake;
                m.matched[maker][3-side].payout += makerPayout;

                m.matched[taker][side].stake += takerStake;
                m.matched[taker][side].odds[takerOdds] += takerStake;
                m.matched[taker][side].payout += takerPayout;

                emit __shake(hid, offchain);

                emit __test__shake__taker(hid, m.matched[taker][side].stake, 
                                             m.matched[taker][side].payout, offchain);
                //emit __test__shake__maker(hid, m.matched[maker][3-side].stake, m.matched[maker][3-side].payout, m.open[maker][3-side].stake, m.open[maker][3-side].payout, offchain);
        }


        event __collect(uint hid, bytes32 offchain);
        event __test__collect(uint network, uint market, uint trader);

        // collect payouts & outstanding stakes (if there is outcome)
        function collect(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 
                require(m.outcome != 0);
                require(now > m.closingTime);

                // calc network commission, market commission and winnings
                uint marketComm = (m.matched[msg.sender][m.outcome].payout * m.fee) / 100;
                uint networkComm = (marketComm * NETWORK_FEE) / 100;
                uint amt = m.matched[msg.sender][m.outcome].payout;

                amt += m.open[msg.sender][1].stake; 
                amt += m.open[msg.sender][2].stake;

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

                emit __refund(hid, offchain);
        }

        event __report(uint hid, bytes32 offchain);

        // report outcome
        function report(uint hid, uint outcome, bytes32 offchain) public {
                Market storage m = markets[hid]; 
                require(msg.sender == m.reporter);
                require(now > m.closingTime);
                m.outcome = outcome;
                emit __report(hid, offchain);
        }

        modifier onlyPredictor(uint hid) {
                require(markets[hid].matched[msg.sender][1].stake > 0 || 
                        markets[hid].matched[msg.sender][2].stake > 0 || 
                        markets[hid].open[msg.sender][1].stake > 0 || 
                        markets[hid].open[msg.sender][2].stake > 0);
                _;
        }
}
