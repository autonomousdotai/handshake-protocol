pragma solidity ^0.4.18;

/**
 * Contract represents a crowdsale as a handshake between a payee (crowdsale owner/creator) with multiple payers (crowdsale backers).
 * After creating the handshake, for a fixed duration, users can fund the crowdsale by shaking.
 * If the handshake doesn't meet the goal after the sale time, users can get a full refund.
 * Otherwise, for a fixed duration after the sale, the fund will be distribute linearly to the crowdsale creator for the to build the  * products.
 * At all time, the backers can vote to cancel the crowdsale if they are not happy with the progress. If the total contributions of the * voted users exceed half the raised fund, the crowdsale is cancelled.
 * The remaining fund that hasn't been distributed to the creator will be refunded to the backers proportionally to there initial  * * * contribution.
 */
contract CrowdsaleHandshake {
    struct Payer {
        uint value;  // total contribution, in wei
        uint vote;  // 0: not voted, 1: cancel
    }

    enum S { Inited, Shaked, Cancelled }

    struct Crowdsale {
        address payee;
        uint totalValue;  // total contribution of all backers
        uint balance;  // current funds (in Weis) of the crowdsale
        uint goal;  // in Weis

        uint saletime;  // before saletime, users can back crowdfund and creator cannot withdraw from it
        uint deadline;  // the fund is distributed linearly to the creator between saletime and deadline
        uint lastIncrease;  // last withdraw

        S state;
        uint m;  // #votes (to cancel crowdsale)
        mapping(address => Payer) payers;
    }

    Crowdsale[] public cs;

    modifier onlyPayee(uint hid) {
        require(msg.sender == cs[hid].payee);
        _;
    }

    modifier onlyPayer(uint hid) {
        require(cs[hid].payers[msg.sender].value > 0);
        _;
    }

    function getState(uint hid) public view returns (S) {
        return cs[hid].state;
    }

    event __init(uint hid, S state, bytes32 offchain);

    /**
     * @dev Create a new crowdsale.
     * @param goal minimum Weis of the crowdsale to pass funding stage.
     * @param saletime duration (in seconds) for user to fund the crowdsale.
     * @param deadline duration (in seconds) to distribute the fund to the crowdsale creator.
     * @param offchain key to the offchain database.
     */
    function initCrowdsale(uint goal, uint saletime, uint deadline, bytes32 offchain) public {
        require(deadline > saletime);
        cs.push(Crowdsale(msg.sender, 0, 0, goal,
                          now + saletime * 1 seconds,
                          now + deadline * 1 seconds,
                          0,
                          S.Inited, 0));
        emit __init(cs.length - 1, S.Inited, offchain);
    }

    event __shake(uint hid, S state, uint balance, bytes32 offchain);

    /**
     * @dev Fund the crowdsale with Ether.
     * @param hid id of the crowdsale to fund.
     * @param offchain key to the offchain database.
     */
    function shake(uint hid, bytes32 offchain) public payable {
        Crowdsale storage c = cs[hid];
        require(msg.value > 0 && now < c.saletime);  // not accept any shake after saletime
        c.payers[msg.sender].value += msg.value;
        c.balance += msg.value;
        c.totalValue = c.balance;  // before payee withdraws, the total contribution is also the balance of the crowdsale
        if (c.state == S.Inited && c.balance >= c.goal) {
            c.state = S.Shaked;
        }
        emit __shake(hid, c.state, c.balance, offchain);
    }

    event __unshake(uint hid, S state, uint balance, bytes32 offchain);

    /**
     * @dev Cancel a crowdsale funding if it's before saletime.
     */
    function unshake(uint hid, bytes32 offchain) public onlyPayer(hid) {
        Crowdsale storage c = cs[hid];
        uint val = c.payers[msg.sender].value;
        require(now < c.saletime && c.balance >= val);

        // Before saletime, creator cannot withdraw; therefore we make full refund to the backer
        c.payers[msg.sender].value = 0;
        c.balance -= val;
        c.totalValue = c.balance;
        if (c.state == S.Shaked && c.balance < c.goal) {
            c.state = S.Inited;
        }
        msg.sender.transfer(val);
        emit __unshake(hid, c.state, c.balance, offchain);
    }

    event __cancel(uint hid, S state, bytes32 offchain);

    /**
     * @dev Vote to cancel a crowdsale.
     */
    function cancel(uint hid, bytes32 offchain) public onlyPayer(hid) {
        Crowdsale storage c = cs[hid];

        // Only allow to vote if the goal is met and the crowdfund is in the stage of building product
        require(c.state == S.Shaked &&
                now >= c.saletime && now < c.deadline &&
                c.payers[msg.sender].vote == 0);
        c.payers[msg.sender].vote = 1;
        c.m += c.payers[msg.sender].value;
        if (c.m * 2 > c.totalValue) {  // over 50% of the total contribution of all backers
            c.state = S.Cancelled;
        }
        emit __cancel(hid, c.state, offchain);
    }

    event __stop(uint hid, S state, bytes32 offchain);

    /**
     * @dev Creator stops the crowdsale.
     */
    function stop(uint hid, bytes32 offchain) public onlyPayee(hid) {
        Crowdsale storage c = cs[hid];
        c.state = S.Cancelled;
        emit __stop(hid, c.state, offchain);
    }

    event __refund(uint hid, S state, bytes32 offchain);

    /**
     * @dev Get a refund from a cancelled crowdsale.
     */
    function refund(uint hid, bytes32 offchain) public {
        // Cancel crowdfund if goal not reached after saletime
        Crowdsale storage c = cs[hid];
        if (c.state == S.Inited && now >= c.saletime && c.balance < c.goal) {
            c.state = S.Cancelled;
        }

        S s = c.state;
        if (s == S.Cancelled) {
            uint val = c.payers[msg.sender].value;
            // Distribute the amount left in the crowdsale based on the user's initial contribution.
            // E.g., the crowdsale raised 10 ETH (totalValue) with 3 ETH funded by msg.sender and the creator already used 4 ETH,
            // they will be refund back (10 - 4) * (3 / 10) = 1.8 ETH
            uint amount = val * c.balance / c.totalValue;
            require(amount <= c.balance && val <= c.totalValue);
            c.balance -= amount;
            c.totalValue -= val;
            c.payers[msg.sender].value = 0;

            msg.sender.transfer(amount);
            emit __refund(hid, c.state, offchain);
        }
    }

    /**
     * @dev Get the additional Weis available for the crowdsale creator to withdraw right now.
     */
    function additionalPettyCash(uint hid) public view returns (uint) {
        uint amount = 0;
        if (now >= cs[hid].saletime) {
            uint x = now;
            uint deadline = cs[hid].deadline;
            uint lastIncrease = cs[hid].lastIncrease;
            if (x >= deadline)
                x = deadline;

            // First withdrawal: get at least 30% of the fund
            if (lastIncrease == 0) {
                amount = cs[hid].balance * 30 / 100;
                lastIncrease = cs[hid].saletime;
            }

            // Distribute linearly between saletime and deadline
            if (deadline > lastIncrease)
                amount += (x - lastIncrease) * (cs[hid].balance - amount) / (deadline - lastIncrease);
        }
        return amount;
    }

    event __withdraw(uint hid, uint amount, bytes32 offchain);

    /**
     * @dev Transfer all available funds right now to the crowdsale creator.
     */
    function withdraw(uint hid, bytes32 offchain) public onlyPayee(hid) {
        Crowdsale storage c = cs[hid];
        require(c.state == S.Shaked && now >= c.saletime);
        uint amount = additionalPettyCash(hid);
        c.lastIncrease = now;
        c.balance -= amount;  // decrease the balance but not the total amount raised
        msg.sender.transfer(amount);
        emit __withdraw(hid, amount, offchain);
    }
}
