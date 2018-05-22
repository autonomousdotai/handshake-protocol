pragma solidity ^0.4.18;

contract BettingHandshake {
    struct Payer {
        uint value;
        uint winValue;
    }

    enum S { Inited, Shaked, Cancelled, Done }
    enum Result { HomeWin, AwayWin, Draw }

    struct Bet {
        address payee;
        uint escrow;  
        uint balance;
        uint goal;
        uint deadline;
        bytes32[] acceptors;

        S state;
        mapping(address => Payer) payers;
        address[] addresses;
    }

    Bet[] public bets;
    address public referee;

    function BettingHandshake() public {
        referee = msg.sender;
    } 

    modifier onlyPayee(uint hid) {
        require(msg.sender == bets[hid].payee);
        _;
    }

    modifier onlyPayer(uint hid) {
        require(bets[hid].payers[msg.sender].value > 0);
        _;
    }

    modifier onlyReferee() {
        require(msg.sender == referee);
        _;
    }

    function getState(uint hid) public view returns (S) {
        return bets[hid].state;
    }

    event __init(uint hid, S state, bytes32 offchain); 


    /**
     * @dev Create a new bet.
     * @param acceptors array of user's hash in offchain
     * @param goal money (in Wei) of payers to fund of bet .
     * @param escrow money (in Wei) for user to fund the bet.
     * @param deadline duration (in seconds) to distribute the fund to the bet creator.
     * @param offchain key to the offchain database.
     */
    function initBet(bytes32[] acceptors, uint goal, uint escrow, uint deadline, bytes32 offchain) public payable {
        require(msg.value == escrow);

        Bet memory b;
        b.payee = msg.sender;
        b.goal = goal;
        b.escrow = escrow;
        b.balance = 0;
        b.addresses = new address[](0);
        b.deadline = now + deadline * 1 seconds;
        b.state = S.Inited;
        b.acceptors = acceptors;
        
        bets.push(b);
        __init(bets.length - 1, S.Inited, offchain);
    }

    event __shake(uint hid, S state, uint balance, bytes32 offchain);

    // payer accept bet
    function shake(bytes32 acceptor, uint hid, bytes32 offchain) public payable {
        Bet storage b = bets[hid];
        require(b.state != S.Cancelled && b.state != S.Done && msg.value > 0 && now < b.deadline);

        if (b.acceptors.length != 0) {
            require(isValidAcceptor(hid, acceptor) == true);
        }

        if (b.payers[msg.sender].value == 0) {
            b.addresses.push(msg.sender);
        }
        
        b.payers[msg.sender].value += msg.value;
        b.payers[msg.sender].winValue += ((msg.value * b.escrow) / b.goal);
        b.balance += msg.value;
        require(b.balance <= b.goal);
        
        b.state = S.Shaked;
        __shake(hid, b.state, b.balance, offchain);
    }

    event __cancel(uint hid, S state, bytes32 offchain);

    // payee cancel bet if there is no any payer
    function cancel(uint hid, bytes32 offchain) public onlyPayee(hid) {
        Bet storage b = bets[hid];
        require(b.state == S.Inited && b.addresses.length == 0);
        b.payee.transfer(b.escrow);

        b.state = S.Cancelled;
        __cancel(hid, b.state, offchain);
    }

    event __withdraw(uint hid, uint escrow, bytes32 offchain);
    
    function withdraw(uint hid, bytes32 offchain) public onlyPayee(hid) {
        Bet storage b = bets[hid];
        require(b.state == S.Shaked && b.balance < b.goal);

        uint remainingMoney = b.escrow - ((b.balance * b.escrow) / b.goal);
        msg.sender.transfer(remainingMoney);

        __withdraw(hid, b.escrow, offchain);
    }

    event __setWinner(uint hid, uint fee, bytes32 offchain);

    function setWinner(uint hid, uint8 result, bytes32 offchain) public onlyReferee() {
        Bet storage b = bets[hid];
        require(b.state == S.Shaked && result >= uint8(Result.HomeWin) && result <= uint8(Result.Draw));
        uint fee = 0;

        if (result == uint8(Result.HomeWin)) {
            fee = homeWin(hid);
            
        } else if (result == uint8(Result.AwayWin)) {
            fee = awayWin(hid);
            
        } else { 
            draw(hid);
        }
        
        sendFee(fee);
        b.state = S.Done;
        __setWinner(hid, fee, offchain);
    }
    
    function homeWin(uint hid) private returns (uint) {
        Bet storage b = bets[hid];
        uint fee = b.balance / 100;
        uint remainingMoney = b.escrow + b.balance - fee;
        b.payee.transfer(remainingMoney);
        return fee;
    }
    
    function awayWin(uint hid) private returns (uint) {
        Bet storage b = bets[hid];
        uint fee = 0;
        for (uint index = 0; index < b.addresses.length; index++) {
            address payer = b.addresses[index];
            Payer storage p = b.payers[payer];
            
            fee += p.winValue / 100;
            uint remainingMoney = p.winValue - fee;
            payer.transfer(remainingMoney);
            b.escrow -= p.winValue;
        }

        if (b.escrow > 0) {
            b.payee.transfer(b.escrow);
        }
        return fee;
    }
    
    function draw(uint hid) private {
        Bet storage b = bets[hid];
        b.payee.transfer(b.escrow);
        for (uint index = 0; index < b.addresses.length; index++) {
            address payer = b.addresses[index];
            Payer storage p = b.payers[payer];
            payer.transfer(p.value);
        }
    }
    
    function sendFee(uint total) private {
        if (total > 0) {
            referee.transfer(total);
        }
    }

    function isValidAcceptor(uint hid, bytes32 acceptor) private view returns (bool value) {
        Bet storage b = bets[hid];
        for (uint index = 0; index < b.acceptors.length; index++) {
            if (b.acceptors[index] == acceptor) {
                value = true;
                return;
            }
        }
    }

    function getWinValue(uint hid) public view returns (uint) {
        return bets[hid].payers[msg.sender].winValue;
    }

    function getBetBalance(uint hid) public view returns (uint, uint) {
        return (bets[hid].addresses.length, bets[hid].balance);
    }

    function getBets() public view returns (uint) {
        return bets.length;
    }
}