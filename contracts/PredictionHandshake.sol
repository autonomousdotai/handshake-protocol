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
*       state: 0 (unknown), 1 (created), 2 (reported), 3 (disputed)
*       __test__* events will be removed prior to production deployment
*       odds are rounded up (2.25 is 225)
*
*/

pragma solidity ^0.4.24;

contract PredictionHandshake {

        struct Market {

                address creator;
                uint fee; 
                bytes32 source;
                uint closingTime; 
                uint reportTime; 
                uint disputeTime;

                uint state;
                uint outcome;
                uint totalStake;
                uint disputeStake;
                bool resolved;

                mapping(address => mapping(uint => Order)) open; // address => side => order
                mapping(address => mapping(uint => Order)) matched; // address => side => order
        }

        struct Order {
                uint stake;
                uint payout;
                mapping(uint => uint) odds; // odds => pool size
        }

        uint public NETWORK_FEE = 20; // 20%
        uint public ODDS_1 = 100; // 1.00 is 100; 2.25 is 225 
        uint public DISPUTE_THRESHOLD = 5; // 5%

        Market[] public markets;
        address public root;


        constructor() public {
                root = msg.sender;
        } 


        event __createMarket(uint hid, bytes32 offchain); 

        function createMarket(
                uint fee, 
                bytes32 source,
                uint closingWindow, 
                uint reportWindow, 
                uint disputeWindow,
                bytes32 offchain
        ) 
                public 
        {
                Market memory m;
                m.creator = msg.sender;
                m.fee = fee;
                m.source = source;
                m.closingTime = now + closingWindow * 1 seconds;
                m.reportTime = m.closingTime + reportWindow * 1 seconds;
                m.disputeTime = m.reportTime + disputeWindow * 1 seconds;
                m.state = 1;
                markets.push(m);

                emit __createMarket(markets.length - 1, offchain);
        }


        event __init(uint hid, bytes32 offchain);
        event __test__init(uint stake, uint payout);

        // market maker
        function init(uint hid, uint side, uint odds, bytes32 offchain) public payable {
                Market storage m = markets[hid];

                require(now < m.closingTime);
                require(m.state == 1);

                m.open[msg.sender][side].stake += msg.value;
                m.open[msg.sender][side].odds[odds] += msg.value;
                m.open[msg.sender][side].payout += ((odds * msg.value) / ODDS_1);
                emit __init(hid, offchain);
                emit __test__init(m.open[msg.sender][side].stake, m.open[msg.sender][side].payout);
        }


        event __uninit(uint hid, bytes32 offchain);
        event __test__uninit(uint stake, uint payout);

        // market maker cancels order
        function uninit(
                uint hid, 
                uint side, 
                uint stake, 
                uint odds, 
                bytes32 offchain
        ) 
                public 
                onlyPredictor(hid) 
        {
                Market storage m = markets[hid];

                require(m.state == 1);
                require(m.open[msg.sender][side].stake >= stake);
                require(m.open[msg.sender][side].odds[odds] >= stake);

                m.open[msg.sender][side].stake -= stake;
                m.open[msg.sender][side].odds[odds] -= stake;
                m.open[msg.sender][side].payout -= ((odds * stake) / ODDS_1);

                msg.sender.transfer(stake);

                emit __uninit(hid, offchain);
                emit __test__uninit(m.open[msg.sender][side].stake, m.open[msg.sender][side].payout);
        }


        event __shake(uint hid, bytes32 offchain);
        event __test__shake__taker__matched(uint stake, uint payout);
        event __test__shake__maker__matched(uint stake, uint payout);
        event __test__shake__maker__open(uint stake, uint payout);

        // market taker
        function shake(
                uint hid, 
                uint side, 
                uint takerOdds, 
                address maker, 
                uint makerOdds, 
                bytes32 offchain
        ) 
                public 
                payable 
        {
                require(maker != 0);
                require(takerOdds >= ODDS_1);
                require(makerOdds >= ODDS_1);

                Market storage m = markets[hid];

                require(m.state == 1);
                require(now < m.closingTime);

                address taker = msg.sender;
                uint takerStake = msg.value;
                uint takerPayout = (takerStake * takerOdds) / ODDS_1;

                uint makerStake = takerPayout - takerStake; 
                uint makerPayout = (makerStake * makerOdds) / ODDS_1;

                // check if the odds matching is valid
                require(takerOdds * ODDS_1 >= makerOdds * (takerOdds - ODDS_1));

                // check if the stake is sufficient
                require(m.open[maker][3-side].odds[makerOdds] >= makerStake);
                require(m.open[maker][3-side].stake >= makerStake);
                require(m.open[maker][3-side].payout >= makerPayout);

                // remove maker's order from open (could be partial)
                m.open[maker][3-side].odds[makerOdds] -= makerStake;
                m.open[maker][3-side].stake -= makerStake;
                m.open[maker][3-side].payout -= makerPayout;

                // add maker's order to matched
                m.matched[maker][3-side].odds[makerOdds] += makerStake;
                m.matched[maker][3-side].stake += makerStake;
                m.matched[maker][3-side].payout += makerPayout;

                // add taker's order to matched
                m.matched[taker][side].odds[takerOdds] += takerStake;
                m.matched[taker][side].stake += takerStake;
                m.matched[taker][side].payout += takerPayout;

                // TODO: add both takerStake and makerStake?
                m.totalStake += takerStake + makerStake;

                emit __shake(hid, offchain);

                emit __test__shake__taker__matched(m.matched[taker][side].stake, m.matched[taker][side].payout);
                emit __test__shake__maker__matched(m.matched[maker][3-side].stake, m.matched[maker][3-side].payout);
                emit __test__shake__maker__open(m.open[maker][3-side].stake, m.open[maker][3-side].payout);

        }


        event __collect(uint hid, bytes32 offchain);
        event __test__collect(uint network, uint market, uint trader);

        // collect payouts & outstanding stakes (if there is outcome)
        function collect(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 

                require(m.state == 2);
                require(now > m.disputeTime);

                // calc network commission, market commission and winnings
                uint marketComm = (m.matched[msg.sender][m.outcome].payout * m.fee) / 100;
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
        event __test__refund(uint amt);

        // refund stakes when market closes (if there is no outcome)
        function refund(uint hid, bytes32 offchain) public onlyPredictor(hid) {
                Market storage m = markets[hid]; 

                require(m.state == 1);
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
                emit __test__refund(amt);
        }


        event __report(uint hid, bytes32 offchain);

        // report outcome
        function report(uint hid, uint outcome, bytes32 offchain) public {
                Market storage m = markets[hid]; 
                require(msg.sender == m.creator);
                require(m.state == 1);
                m.outcome = outcome;
                m.state = 2;
                emit __report(hid, offchain);
        }


        event __dispute(uint hid, bytes32 offchain);

        // dispute outcome
        function dispute(uint hid, bytes32 offchain) public {
                Market storage m = markets[hid]; 
                require(m.state == 2);
                require(!m.resolved);
                m.disputeStake += m.matched[msg.sender][m.outcome].stake;

                // if dispute stakes > 5% of the total stakes
                if (100 * m.disputeStake > DISPUTE_THRESHOLD * m.totalStake) {
                        m.state = 3;
                }
                emit __dispute(hid, offchain);
        }


        event __resolve(uint hid, bytes32 offchain);

        function resolve(uint hid, uint outcome, bytes32 offchain) public {
                require(msg.sender == root);
                Market storage m = markets[hid]; 
                require(m.state == 3);
                m.resolved = true;
                m.outcome = outcome;
                m.state = outcome == 0? 1: 2;
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
