const p2p = artifacts.require('BettingHandshake');
const assert = require('assert');

const u = require('./util.js');
var oc = u.oc;
var b2s = u.b2s;

contract('BettingHandshake', (accounts) => {
    const root = accounts[0];
    const payee1 = accounts[1];
    const payee2 = accounts[2];

    const payer1 = accounts[3];
    const payer2 = accounts[4];
    const payer3 = accounts[5];
    const payer4 = accounts[6];
    const payer5 = accounts[7];
    const payer6 = accounts[8];
    const payer7 = accounts[9];
    
    let hs;
    let hid, state, offchain;
    let hid1, state1, offchain1;
    async function createBettingHandShake () {
        const info = {
            acceptors: [],
            escrow: web3.toWei(1),
            goal: web3.toWei(0.3),
            deadline: 86399,
            sender: payee1,
            offchain: 'cts_1',
        };
        const tx = await hs.initBet(info.acceptors, info.goal, info.escrow, info.deadline, info.offchain, { from: info.sender, value: info.escrow });
        hid = await oc(tx, '__init', 'hid').toNumber();
        state = await oc(tx, '__init', 'state').toNumber();
        offchain = await b2s(oc(tx, '__init', 'offchain'));
    };

    async function createBettingHandShakeWithAcceptors () {
        const info = {
            acceptors: [payer3, payer4, payer5, payer6, payer7],
            escrow: web3.toWei(2),
            goal: web3.toWei(2.3),
            deadline: 86399,
            sender: payee2,
            offchain: 'cts_2',
        };
        const tx = await hs.initBet(info.acceptors, info.goal, info.escrow, info.deadline, info.offchain, { from: info.sender, value: info.escrow });
        hid1 = await oc(tx, '__init', 'hid').toNumber();
        state1 = await oc(tx, '__init', 'state').toNumber();
        offchain1 = await b2s(oc(tx, '__init', 'offchain'));
    };

    before(async () => {
        hs = await p2p.deployed();
    });

    it('deploy contract', async () => {
        assert.ok(hs.address);

        const referee = await hs.referee.call();
        assert.equal(referee, root);
    });

    describe('at any time', () => {

        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('init handshake', async () => {
            assert.equal(offchain, 'cts_1');
            assert.equal(hid, 0);
            assert.equal(state, 0);
    
            let bet = await hs.bets(hid);
            assert.equal(bet[0], payee1);
            assert.equal(bet[1], web3.toWei(1))
        });

        it('shake handshake ', async () => {            
            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            let balance = await oc(tx, '__shake', 'balance');
            let value = await hs.getWinValue(hid, { from: payer1 });

            assert.equal(balance.toNumber(), 100000000000000000);
            assert.equal(value.toNumber(), 333333333333333300);

            tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            balance = await oc(tx, '__shake', 'balance');
            value = await hs.getWinValue(hid, { from: payer1 });
            assert.equal(balance.toNumber(), 100000000000000000 * 2);
            assert.equal(value.toNumber(), 333333333333333300 * 2);
        });

        it('cancel handshake', async () => {
            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payer2 }));
            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            let time = u.latestTime();
            let canCancel = time + 360000; // increase time > 3 days from deadline

            await u.increaseTimeTo(canCancel);
            tx = await hs.cancelBet(hid, offchain, { from: payee1 });

            let balance = await oc(tx, '__cancelBet', 'balance');
            let escrow = await oc(tx, '__cancelBet', 'escrow');
            let value = await hs.getWinValue(hid, { from: payee1 });
            
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);
            assert.equal(value.toNumber(), 0);

            value = await hs.getWinValue(hid, { from: payer1 });
            assert.equal(value.toNumber(), 0);
        });

        it('close bet', async () => {
            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payer2 }));
            const oldBalance = await web3.eth.getBalance(payee1).toNumber();
            let tx = await hs.closeBet(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__closeBet', 'state');
            let balance = await oc(tx, '__closeBet', 'balance');
            let escrow = await oc(tx, '__closeBet', 'escrow');
            const newBalance = await web3.eth.getBalance(payee1).toNumber();

            assert.ok(newBalance > oldBalance);
            assert.equal(state, 2); // S.Closed
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);

            await createBettingHandShake();
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            tx = await hs.closeBet(hid, offchain, { from: payee1 });
            state = await oc(tx, '__closeBet', 'state');
            balance = await oc(tx, '__closeBet', 'balance');
            escrow = await oc(tx, '__closeBet', 'escrow');

            assert.equal(state, 1); // S.Shaked
            assert.equal(balance.toNumber(), 100000000000000000);
            assert.equal(escrow.toNumber(), 333333333333333300);
        });

        it('initiator won', async () => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.initiatorWon(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__initiatorWon', 'state');
            let balance = await oc(tx, '__initiatorWon', 'balance');
            let escrow = await oc(tx, '__initiatorWon', 'escrow');

            assert.equal(state, 4); // S.InitiatorWon
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether
        });

        it('betor won', async () => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.betorWon(hid, offchain, { from: payer1 });
            let state = await oc(tx, '__betorWon', 'state');
            let balance = await oc(tx, '__betorWon', 'balance');
            let escrow = await oc(tx, '__betorWon', 'escrow');

            assert.equal(state, 5); // S.BetorWon
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether
        });

        it('draw', async() => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.draw(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__draw', 'state');
            let balance = await oc(tx, '__draw', 'balance');
            let escrow = await oc(tx, '__draw', 'escrow');

            assert.equal(state, 6); // S.Draw
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether
        });

        it('withdraw', async() => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.initiatorWon(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__initiatorWon', 'state');
            let balance = await oc(tx, '__initiatorWon', 'balance');
            let escrow = await oc(tx, '__initiatorWon', 'escrow');

            assert.equal(state, 4); // S.InitiatorWon
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether

            time = u.latestTime();
            let canWithdraw = time + 90000; // increase time > reject window
            await u.increaseTimeTo(canWithdraw);
            await u.assertRevert(hs.withdraw(hid, offchain, { from: payer2 }))

            // balance, escrow not change because winner is initiator
            const actualBalance = 100000000000000000;
            const actualEscrow = 1000000000000000000;
            tx = await hs.withdraw(hid, offchain, { from: payer1 })
            state = await oc(tx, '__withdraw', 'state');
            balance = await oc(tx, '__withdraw', 'balance');
            escrow = await oc(tx, '__withdraw', 'escrow');

            assert.equal(state, 7); // S.Accepted
            assert.equal(balance.toNumber(), actualBalance); // 0.1 ether
            assert.equal(escrow.toNumber(), actualEscrow); // 1 ether

            // initiator withdraw
            const oldBalance = web3.eth.getBalance(payee1).toNumber();
            tx = await hs.withdraw(hid, offchain, { from: payee1 })
            state = await oc(tx, '__withdraw', 'state');
            balance = await oc(tx, '__withdraw', 'balance');
            escrow = await oc(tx, '__withdraw', 'escrow');

            const newBalance = web3.eth.getBalance(payee1).toNumber();
            assert.ok(oldBalance < newBalance);
            assert.equal(state, 9); // S.Done
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);
        });

        it('reject handshake', async () => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.initiatorWon(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__initiatorWon', 'state');
            let balance = await oc(tx, '__initiatorWon', 'balance');
            let escrow = await oc(tx, '__initiatorWon', 'escrow');

            assert.equal(state, 4); // S.InitiatorWon
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether

            tx = await hs.reject(hid, offchain, { from: payer1 });
            state = await oc(tx, '__reject', 'state');
            balance = await oc(tx, '__reject', 'balance');
            escrow = await oc(tx, '__reject', 'escrow');

            assert.equal(state, 8); // S.Reject
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether
        });

        it('set winner', async () => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.initiatorWon(hid, offchain, { from: payee1 });
            await hs.reject(hid, offchain, { from: payer1 });
            await u.assertRevert(hs.setWinner(hid, 5, offchain, { from: payer2 }));
            await u.assertRevert(hs.setWinner(hid, 4, offchain, { from: payee1 }));

            tx = await hs.setWinner(hid, 4, offchain, { from: root }); // payee1 is winner
            let state = await oc(tx, '__setWinner', 'state');
            let balance = await oc(tx, '__setWinner', 'balance');
            let escrow = await oc(tx, '__setWinner', 'escrow');

            assert.equal(state, 7); // S.Accepted

            const payeeOldBalance = await web3.eth.getBalance(payee1).toNumber();
            const payer1OldBalance = await web3.eth.getBalance(payer1).toNumber();

            tx = await hs.withdraw(hid, offchain, { from: payee1 });
            const payeeNewBalance = await web3.eth.getBalance(payee1).toNumber();
            const payer1NewBalance = await web3.eth.getBalance(payer1).toNumber();


            state = await oc(tx, '__withdraw', 'state');
            balance = await oc(tx, '__withdraw', 'balance');
            escrow = await oc(tx, '__withdraw', 'escrow');
            
            assert.equal(state, 9); // S.Done
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);
            assert.equal(payer1OldBalance, payer1NewBalance);
            assert.ok(payeeOldBalance < payeeNewBalance);
        });
    }); 

    describe('when hanshake is inited', () => {
        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('can close bet now', async () => {
            await u.assertRevert(hs.closeBet(hid, offchain, { from: payee2 }));
            await u.assertRevert(hs.closeBet(hid, offchain, { from: payer1 }));

            let oldBalance = await web3.eth.getBalance(payee1).toNumber();
            let tx = await hs.closeBet(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__closeBet', 'state');
            let balance = await oc(tx, '__closeBet', 'balance');
            let escrow = await oc(tx, '__closeBet', 'escrow');
            let newBalance = await web3.eth.getBalance(payee1).toNumber();

            assert.ok(newBalance > oldBalance);
            assert.equal(state, 2); // S.Closed
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);
        });

        it('can close bet if time exceed deadline', async () => {
            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            const oldBalance = await web3.eth.getBalance(payee1).toNumber();
            const tx = await hs.closeBet(hid, offchain, { from: payee1 });
            const state = await oc(tx, '__closeBet', 'state');
            const balance = await oc(tx, '__closeBet', 'balance');
            const escrow = await oc(tx, '__closeBet', 'escrow');
            const newBalance = await web3.eth.getBalance(payee1).toNumber();

            assert.ok(newBalance > oldBalance);
            assert.equal(state, 2); // S.Closed
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);
        });

        it('can close bet to withdraw remaining money if there is someone shake', async () => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            const tx = await hs.closeBet(hid, offchain, { from: payee1 });
            const state = await oc(tx, '__closeBet', 'state');
            const balance = await oc(tx, '__closeBet', 'balance');
            const escrow = await oc(tx, '__closeBet', 'escrow');

            assert.equal(state, 1); // S.Shaked
            assert.equal(balance.toNumber(), 100000000000000000);
            assert.equal(escrow.toNumber(), 333333333333333300);
        });
    })

    describe('when hanshake is shaked', () => {
        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('cannot shake when hs is closed', async () => {
            const tx = await hs.closeBet(hid, offchain, { from: payee1 });
            await u.assertRevert(hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) }));
        });
 
        it('can shake more to increase value', async () => {
            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            let state = await oc(tx, '__shake', 'state');
            let balance = await oc(tx, '__shake', 'balance');
            let escrow = await oc(tx, '__shake', 'escrow');

            assert.equal(state, 1); // S.Shaked
            assert.equal(balance.toNumber(), web3.toWei(0.1) * 2);
            assert.equal(escrow.toNumber(), 1000000000000000000);

            balance = await hs.getWinValue(hid, { from: payer1 });
            assert.equal(balance.toNumber(), 333333333333333300 * 2);
        });

        it('cannot shake when time exceed deadline', async () => {
            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);
            await u.assertRevert(hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) }));
        });

        it('cannot shake if balance = goal', async () => {
            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.3) });
            await u.assertRevert(hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) }));
        });

        it('cannot shake if value exceed > goal', async () => {
            await u.assertRevert(hs.shake(hid, offchain, { from: payer1, value: web3.toWei(1) }));
        });
    });

    describe('hanshake is cancelled', () => {
        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('can call cancel when time exceed review window', async () => {
            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let state = await oc(tx, '__shake', 'state');
            let balance = await oc(tx, '__shake', 'balance');
            let escrow = await oc(tx, '__shake', 'escrow');

            assert.equal(state, 1); // S.Shaked
            assert.equal(balance.toNumber(), web3.toWei(0.1));
            assert.equal(escrow.toNumber(), 1000000000000000000);

            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payer1 }));
            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payee1 }));
            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payer2 }));
            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payee2 }));

            let time = u.latestTime();
            let canCancel = time + 360000; // increase time > 3 days from deadline
            await u.increaseTimeTo(canCancel);

            const payee1OldBalance = web3.eth.getBalance(payee1).toNumber();
            const payer1OleBalance = web3.eth.getBalance(payer1).toNumber();

            tx = await hs.cancelBet(hid, offchain, { from: payee1 });
            const payee1NewBalance = web3.eth.getBalance(payee1).toNumber();
            const payer1NewBalance = web3.eth.getBalance(payer1).toNumber();

            state = await oc(tx, '__cancelBet', 'state');
            balance = await oc(tx, '__cancelBet', 'balance');
            escrow = await oc(tx, '__cancelBet', 'escrow');

            assert.ok(payer1OleBalance < payer1NewBalance);
            assert.ok(payee1OldBalance < payee1NewBalance);
            assert.equal(state, 3); // S.Cancelled
            assert.equal(balance.toNumber(), 0);
            assert.equal(escrow.toNumber(), 0);
        });

    });

    describe('handshake has who won', () => {

        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('cannot set who won if time < deadline', async () => {
            await u.assertRevert(hs.initiatorWon(hid, offchain, { from: payee1 }));
            await u.assertRevert(hs.initiatorWon(hid, offchain, { from: payer1 }));
            await u.assertRevert(hs.initiatorWon(hid, offchain, { from: payer2 }));

            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // > deadline
            await u.increaseTimeTo(canSetWhoWon);
            await hs.initiatorWon(hid, offchain, { from: payee1 });
        });

        it('only set who won one time', async () => {
            let tx = await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // > deadline
            await u.increaseTimeTo(canSetWhoWon);
            await hs.initiatorWon(hid, offchain, { from: payee1 });
            await u.assertRevert(hs.initiatorWon(hid, offchain, { from: payee1 }));
        });

    });

    describe('handshake can withdraw', () => {

        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('can withdraw if no one reject and time > reject window', async () => {

        });

        it('cannot set who won when there is someone withdraw', async () => {

        });

    });

    describe('handshake is rejected', () => {

    });

    describe('private bet', () => {
        beforeEach( async() => {
            await createBettingHandShakeWithAcceptors();
        });

        it('init handshake', async () => {
            assert.equal(offchain1, 'cts_2');
            assert.equal(state1, 0);

            const bet = await hs.bets(hid1);
            assert.equal(bet[0], payee2);
            assert.equal(bet[1], web3.toWei(2))
        });

        it('shake handshake', async () => {
            await u.assertRevert(hs.shake(hid1, offchain1, { from: payer2, value: web3.toWei(0.1) }));
            await u.assertRevert(hs.shake(hid1, offchain1, { from: payer2, value: web3.toWei(0.1) }));
        });
    });

});
