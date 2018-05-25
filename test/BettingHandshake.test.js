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

        it('init handshake', async () => {
            await createBettingHandShake();
            assert.equal(offchain, 'cts_1');
            assert.equal(hid, 0);
            assert.equal(state, 0);
    
            let bet = await hs.bets(hid);
            assert.equal(bet[0], payee1);
            assert.equal(bet[1], web3.toWei(1))
        });

        it('shake handshake ', async () => {
            await createBettingHandShake();
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
            await createBettingHandShake();
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
            await createBettingHandShake();
            await u.assertRevert(hs.cancelBet(hid, offchain, { from: payer2 }));
            let tx = await hs.closeBet(hid, offchain, { from: payee1 });
            let state = await oc(tx, '__closeBet', 'state');
            let balance = await oc(tx, '__closeBet', 'balance');
            let escrow = await oc(tx, '__closeBet', 'escrow');

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
            await createBettingHandShake();
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
            await createBettingHandShake();
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });

            let time = u.latestTime();
            let canSetWhoWon = time + 90000; // increase time > deadline
            await u.increaseTimeTo(canSetWhoWon);

            let tx = await hs.betorWon(hid, offchain, { from: payer1 });
            let state = await oc(tx, '__betorWon', 'state');
            let balance = await oc(tx, '__betorWon', 'balance');
            let escrow = await oc(tx, '__betorWon', 'escrow');

            assert.equal(state, 5); // S.InitiatorWon
            assert.equal(balance.toNumber(), 100000000000000000); // 0.1 ether
            assert.equal(escrow.toNumber(), 1000000000000000000); // 1 ether
        });

        it('draw', async() => {
            await createBettingHandShake();
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
            await createBettingHandShake();
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

        // it('withdraw handshake', async () => {
        //     try {
        //         await hs.widthdraw(hid, offchain, { from: payer2 });
        //     } catch (e) {
        //         assert.ok('cannot withdraw bet!');
        //     }

        //     try {
        //         await hs.widthdraw(hid, offchain, { from: payee1 });
        //     } catch (e) {
        //         assert.ok('cannot withdraw bet!');
        //     }
        // });

        // it('set winner', async () => {
        //     u.assertRevert(hs.setWinner(hid, 0, offchain, { from: payer2 }));
        //     try {
        //         await hs.setWinner(hid, 0, offchain, { from: payee1 });
        //     } catch (e) {
        //         assert.ok('cannot set winner!');
        //     }

        //     const rootOldBalance = web3.eth.getBalance(root).toNumber(); // will receive winer fee
        //     const payee1OldBalance = web3.eth.getBalance(payee1).toNumber();
        //     const payer1OldBalance = web3.eth.getBalance(payer1).toNumber();
        //     const payer2OldBalance = web3.eth.getBalance(payer2).toNumber();

        //     // home win
        //     let tx = await hs.setWinner(hid, 0, offchain, { from: root });
        //     const txHash = tx['receipt']['transactionHash'];
        //     const log = await web3.eth.getTransaction(txHash);

        //     const gasUsed = tx['receipt']['gasUsed'];
        //     const gasPrice = log['gasPrice'].toNumber();

        //     assert.equal(await oc(tx, '__setWinner', 'hid'), hid);
        //     const fee = await oc(tx, '__setWinner', 'fee').toNumber();
        //     assert.notEqual(fee, 0);

        //     const rootNewBalance = web3.eth.getBalance(root).toNumber();
        //     assert.equal(rootOldBalance + fee - (gasUsed * gasPrice), rootNewBalance);

        //     const payee1NewBalance = web3.eth.getBalance(payee1).toNumber();
        //     assert.notEqual(payee1OldBalance, payee1NewBalance);

        //     const payer1NewBalance = web3.eth.getBalance(payer1).toNumber();
        //     assert.equal(payer1NewBalance, payer1OldBalance);
        //     const payer2NewBalance = web3.eth.getBalance(payer2).toNumber();
        //     assert.equal(payer2NewBalance, payer2OldBalance);
        // });
    }); 


    describe('when hanshake is shaked', () => {
        beforeEach( async() => {
            await createBettingHandShake();
        });

        it('cannot shake when hs is closed', async () => {
            const tx = await hs.closeBet(hid, offchain, { from: payee1 });
            await u.assertRevert(hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) }));
        });

        it('can shake more to increase value', async () => {
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            await hs.shake(hid, offchain, { from: payer1, value: web3.toWei(0.1) });
        });
    })

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
