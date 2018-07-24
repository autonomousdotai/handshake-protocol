/*
*
* PredictionExchange is an exchange contract that doesn't accept bets on the outcomes,
* but instead matchedes backers/takers (those betting on odds) with layers/makers 
* (those offering the odds).
*
* Note:
*
*       side: 0 (unknown), 1 (support), 2 (against), 3 (draw)
*       role: 0 (unknown), 1 (maker), 2 (taker)
*       state: 0 (unknown), 1 (created), 2 (reported), 3 (disputed)
*       __test__* events will be removed prior to production deployment
*       odds are rounded up (2.25 is 225)
*
*/

pragma solidity ^0.4.24;

import "./TokenRegistry.sol";

contract PredictionHandshakeWithToken {
    struct Market {
        address creator;
        uint fee; 
        bytes32 source;
        uint closingTime; 
        uint reportTime; 
        uint disputeTime;
        
        address token;

        uint state;
        uint outcome;

        uint totalOpenStake;
        uint totalMatchedStake;
        uint disputeMatchedStake;
        bool resolved;

        mapping(address => mapping(uint => Order)) open; // address => side => order
        mapping(address => mapping(uint => Order)) matched; // address => side => order
        mapping(address => bool) disputed;
    }

    function getOpenData(uint hid, address user, uint side) public onlyRoot view returns(uint, uint)  {
        Market storage m = markets[hid];
        Order storage o = m.open[user][side];
        return (o.stake, o.payout);
    }

    function getMatchedData(uint hid, address user, uint side) public onlyRoot view returns(uint, uint)  {
        Market storage m = markets[hid];
        Order storage o = m.matched[user][side];
        return (o.stake, o.payout);
    }

    struct Order {
        uint stake;
        uint payout;
        mapping(uint => uint) odds; // odds => pool size
    }

    uint public NETWORK_FEE = 20; // 20%
    uint public ODDS_1 = 100; // 1.00 is 100; 2.25 is 225 
    uint public DISPUTE_THRESHOLD = 5; // 5%
    uint public EXPIRATION = 30 days; 

    Market[] public markets;
    address public root;
    mapping(address => uint) public total;
    
    // token management
    TokenRegistry tokenRegistry;
    address tokenRegistryAddress;

    constructor(address _tokenRegistryAddress) public {
        root = msg.sender;
        tokenRegistryAddress = _tokenRegistryAddress;
        tokenRegistry = TokenRegistry(_tokenRegistryAddress);
    } 

    modifier tokenExisted(address _tokenAddr) {
        require(tokenRegistry.tokenIsExisted(_tokenAddr) == true);
        _;
    }

    // grant permission for this contract to send ERC20 token
    function approveNewTokens(address[] _tokenAddresses) public onlyRoot {
        for(uint i = 0; i < _tokenAddresses.length; i++) {
            if (tokenRegistry.tokenIsExisted(_tokenAddresses[i]) == true) {
                require(
                    Token(_tokenAddresses[i]).approve(tokenRegistryAddress, 2**256-1)
                );
            } 
        }
    }

    event __approveNewToken(bytes32 offchain); 

    function approveNewToken(address tokenAddress, bytes32 offchain) public onlyRoot {
        if (tokenRegistry.tokenIsExisted(tokenAddress) == true) {
            require(
                Token(tokenAddress).approve(tokenRegistryAddress, 2**256-1)
            );
            emit __approveNewToken(offchain);
        }
    }

    event __createMarket(uint hid, bytes32 offchain); 

    function createMarket(
        uint fee, 
        bytes32 source,
        address tokenAddress,
        uint closingWindow, 
        uint reportWindow, 
        uint disputeWindow,
        bytes32 offchain
    ) 
        public 
        tokenExisted(tokenAddress)
    {
        _createMarket(msg.sender, fee, source, tokenAddress, closingWindow, reportWindow, disputeWindow, offchain);
    }


    function createMarketForShurikenUser(
        address creator,
        uint fee, 
        bytes32 source,
        address tokenAddress,
        uint closingWindow, 
        uint reportWindow, 
        uint disputeWindow,
        bytes32 offchain
    ) 
        public 
        tokenExisted(tokenAddress)
        onlyRoot
    {
        _createMarket(creator, fee, source, tokenAddress, closingWindow, reportWindow, disputeWindow, offchain);
    }


    function _createMarket(
        address creator,
        uint fee, 
        bytes32 source,
        address tokenAddress,
        uint closingWindow, 
        uint reportWindow, 
        uint disputeWindow,
        bytes32 offchain
    ) 
        private 
    {
        Market memory m;
        m.creator = creator;
        m.fee = fee;
        m.source = source;
        m.token = tokenAddress;
        m.closingTime = now + closingWindow * 1 seconds;
        m.reportTime = m.closingTime + reportWindow * 1 seconds;
        m.disputeTime = m.reportTime + disputeWindow * 1 seconds;
        m.state = 1;
        markets.push(m);

        emit __createMarket(markets.length - 1, offchain);
    }


    event __init(uint hid, bytes32 offchain);
    event __test__init(uint stake);

    // market maker
    function init(
        uint hid, 
        uint side, 
        uint odds, 
        uint amount,
        bytes32 offchain
    ) 
        public 
    {
        Market storage m = markets[hid];

        require(now < m.closingTime);
        require(m.state == 1);
        require(tokenRegistry.transferToken(m.token, msg.sender, address(this), amount));

        m.open[msg.sender][side].stake += amount;
        m.open[msg.sender][side].odds[odds] += amount;
        m.totalOpenStake += amount;

        emit __init(hid, offchain);
        emit __test__init(m.open[msg.sender][side].stake);
    }
    
    
    event __uninit(uint hid, bytes32 offchain);
    event __test__uninit(uint stake);

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

        require(m.open[msg.sender][side].stake >= stake);
        require(m.open[msg.sender][side].odds[odds] >= stake);
        require(tokenRegistry.transferToken(m.token, address(this), msg.sender, stake));

        m.open[msg.sender][side].stake -= stake;
        m.open[msg.sender][side].odds[odds] -= stake;
        m.totalOpenStake -= stake;

        emit __uninit(hid, offchain);
        emit __test__uninit(m.open[msg.sender][side].stake);
    }

    event __shake(uint hid, bytes32 offchain);

    // market taker
    function shake(
        uint hid, 
        uint side, 
        uint takerOdds, 
        address maker, 
        uint makerOdds, 
        uint amount,
        bytes32 offchain
    ) 
        public 
    {
        require(maker != 0);
        require(takerOdds >= ODDS_1);
        require(makerOdds >= ODDS_1);

        Market storage m = markets[hid];

        require(m.state == 1);
        require(now < m.closingTime);

        uint makerSide = 3 - side;

        require(tokenRegistry.transferToken(m.token, msg.sender, address(this), amount));
        uint takerStake = amount;
        uint makerStake = m.open[maker][makerSide].stake;

        uint takerPayout = (takerStake * takerOdds) / ODDS_1;
        uint makerPayout = (makerStake * makerOdds) / ODDS_1;

        if (takerPayout < makerPayout) {
            makerStake = takerPayout - takerStake;
            makerPayout = takerPayout;
        } else {
            takerStake = makerPayout - makerStake;
            takerPayout = makerPayout;
        }

        // check if the odds matching is valid
        require(takerOdds * ODDS_1 >= makerOdds * (takerOdds - ODDS_1));

        // check if the stake is sufficient
        require(m.open[maker][makerSide].odds[makerOdds] >= makerStake);
        require(m.open[maker][makerSide].stake >= makerStake);

        // remove maker's order from open (could be partial)
        m.open[maker][makerSide].odds[makerOdds] -= makerStake;
        m.open[maker][makerSide].stake -= makerStake;
        m.totalOpenStake -=  makerStake;

        // add maker's order to matched
        m.matched[maker][makerSide].odds[makerOdds] += makerStake;
        m.matched[maker][makerSide].stake += makerStake;
        m.matched[maker][makerSide].payout += makerPayout;
        m.totalMatchedStake += makerStake;

        // add taker's order to matched
        m.matched[msg.sender][side].odds[takerOdds] += takerStake;
        m.matched[msg.sender][side].stake += takerStake;
        m.matched[msg.sender][side].payout += takerPayout;
        m.totalMatchedStake += takerStake;

        emit __shake(hid, offchain);
    }


    event __collect(uint hid, bytes32 offchain);
    event __test__collect(uint network, uint market, uint trader);

    function collect(uint hid, bytes32 offchain) public onlyPredictor(hid) {
        _collect(hid, msg.sender, offchain);
    }

    // collect payouts & outstanding stakes (if there is outcome)
    function _collect(uint hid, address winner, bytes32 offchain) private {
        Market storage m = markets[hid]; 

        require(m.state == 2);
        require(now > m.disputeTime);

        // calc network commission, market commission and winnings
        uint marketComm = (m.matched[winner][m.outcome].payout * m.fee) / 100;
        uint networkComm = (marketComm * NETWORK_FEE) / 100;

        uint amt = m.matched[winner][m.outcome].payout;

        amt += m.open[winner][1].stake; 
        amt += m.open[winner][2].stake;

        require(amt - marketComm > 0);
        require(marketComm - networkComm > 0);

        // update totals
        m.totalOpenStake -= m.open[winner][1].stake;
        m.totalOpenStake -= m.open[winner][2].stake;
        m.totalMatchedStake -= m.matched[winner][1].stake;
        m.totalMatchedStake -= m.matched[winner][2].stake;

        // wipe data
        m.open[winner][1].stake = 0; 
        m.open[winner][2].stake = 0;
        m.matched[winner][1].stake = 0; 
        m.matched[winner][2].stake = 0;
        m.matched[winner][m.outcome].payout = 0;

        require(tokenRegistry.transferToken(m.token, address(this), winner, amt - marketComm));
        require(tokenRegistry.transferToken(m.token, address(this), m.creator, marketComm - networkComm));
        require(tokenRegistry.transferToken(m.token, address(this), root, networkComm));

        emit __collect(hid, offchain);
        emit __test__collect(networkComm, marketComm - networkComm, amt - marketComm);
    }


    event __refund(uint hid, bytes32 offchain);
    event __test__refund(uint amt);

    // refund stakes when market closes (if there is no outcome)
    function refund(uint hid, bytes32 offchain) public onlyPredictor(hid) {

        Market storage m = markets[hid]; 

        require(m.state == 1 || m.outcome == 3);
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

        require(tokenRegistry.transferToken(m.token, address(this), msg.sender, amt));
        
        emit __refund(hid, offchain);
        emit __test__refund(amt);
    }


    event __report(uint hid, bytes32 offchain);

    // report outcome
    function report(uint hid, uint outcome, bytes32 offchain) public {
        Market storage m = markets[hid]; 
        require(now <= m.reportTime);
        require(msg.sender == m.creator);
        require(m.state == 1);
        m.outcome = outcome;
        m.state = 2;
        emit __report(hid, offchain);
    }


    event __dispute(uint hid, uint state, bytes32 offchain);

    // dispute outcome
    function dispute(uint hid, bytes32 offchain) public onlyPredictor(hid) {
        Market storage m = markets[hid]; 

        require(now <= m.disputeTime);
        require(m.state == 2);
        require(!m.resolved);

        require(!m.disputed[msg.sender]);
        m.disputed[msg.sender] = true;

        m.disputeMatchedStake += m.matched[msg.sender][1].stake;
        m.disputeMatchedStake += m.matched[msg.sender][2].stake;

        // if dispute stakes > 5% of the total stakes
        if (100 * m.disputeMatchedStake > DISPUTE_THRESHOLD * m.totalMatchedStake) {
            m.state = 3;
        }
        emit __dispute(hid, m.state, offchain);
    }


    event __resolve(uint hid, bytes32 offchain);

    function resolve(uint hid, uint outcome, bytes32 offchain) public onlyRoot {
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


    modifier onlyRoot() {
        require(msg.sender == root);
        _;
    }
}
