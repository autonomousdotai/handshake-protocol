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
    
    let hs;
    let hid, state, offchain;
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
            acceptors: ['2', '1', '3', '4', '5'],
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

    before(async () => {
        hs = await p2p.deployed();
    });

    it('deploy contract', async () => {
        assert.ok(hs.address);

        const referee = await hs.referee.call();
        assert.equal(referee, root);
    });

    describe('at any time', () => {
        beforeEach( async () => {
            if (offchain !== 'cts_1') {
                await createBettingHandShake();
            }
        });

        it('init handshake', async () => {
            assert.equal(offchain, 'cts_1');
            assert.equal(hid, 0);
            assert.equal(state, 0);
    
            const bet = await hs.bets.call(0);
            assert.equal(bet[0], payee1);

            // create new one from another payee
            const info = {
                acceptors: [],
                escrow: web3.toWei(1),
                goal: web3.toWei(0.3),
                deadline: 86399,
                sender: payee2,
                offchain: 'cts_2',
            };

            let tx = await hs.initBet(info.acceptors, info.goal, info.escrow, info.deadline, info.offchain, { from: info.sender, value: info.escrow });
            const _hid = await oc(tx, '__init', 'hid').toNumber();
            const _offchain = await b2s(oc(tx, '__init', 'offchain'));

            assert.notEqual(_hid, hid);
            assert.notEqual(_offchain, offchain);

            const bets = await hs.getBets({ from: payee1 });
            assert.equal(bets.toNumber(), 2);
        });
    
        it('shake handshake', async () => {
            let tx = await hs.shake('', hid, offchain, { from: payer1, value: web3.toWei(0.1) });
        
            let balance = await oc(tx, '__shake', 'balance');
            assert.equal(balance.toNumber(), 100000000000000000);
    
            let value = await hs.getWinValue(hid, { from: payer1 });
            assert.equal(value.toNumber(), 333333333333333300);
            
            let bBalance = await hs.getBetBalance(hid, { from: root });
            assert.equal(bBalance[1].toNumber(), 100000000000000000);
            assert.equal(bBalance[0].toNumber(), 1);

            tx = await hs.shake('', hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            balance = await oc(tx, '__shake', 'balance');
            assert.equal(balance.toNumber(), 200000000000000000);

            value = await hs.getWinValue(hid, { from: payer1 });
            assert.equal(value.toNumber(), (333333333333333300 * 2));

            bBalance = await hs.getBetBalance(hid, { from: root });
            assert.equal(bBalance[1].toNumber(), 200000000000000000);
            assert.equal(bBalance[0].toNumber(), 1);

            tx = await hs.shake('', hid, offchain, { from: payer2, value: web3.toWei(0.1) });
            balance = await oc(tx, '__shake', 'balance');
            assert.equal(balance.toNumber(), 300000000000000000);

            value = await hs.getWinValue(hid, { from: payer2 });
            assert.equal(value.toNumber(), 333333333333333300);
            bBalance = await hs.getBetBalance(hid, { from: payer2 });
            assert.equal(bBalance[1].toNumber(), 300000000000000000);
            assert.equal(bBalance[0].toNumber(), 2);

        });

        it('cancel handshake', async () => {
            u.assertRevert(hs.cancel(hid, offchain, { from: payer2 }));
            try {
                await hs.cancel(hid, offchain, { from: payee1 });
            } catch (e) {
                assert.ok('cannot cancel bet!');
            }
        });

        it('withdraw handshake', async () => {
            try {
                await hs.widthdraw(hid, offchain, { from: payer2 });
            } catch (e) {
                assert.ok('cannot withdraw bet!');
            }

            try {
                await hs.widthdraw(hid, offchain, { from: payee1 });
            } catch (e) {
                assert.ok('cannot withdraw bet!');
            }
        });

        it('set winner', async () => {
            u.assertRevert(hs.setWinner(hid, 0, offchain, { from: payer2 }));
            try {
                await hs.setWinner(hid, 0, offchain, { from: payee1 });
            } catch (e) {
                assert.ok('cannot set winner!');
            }

            const rootOldBalance = web3.eth.getBalance(root).toNumber(); // will receive winer fee
            const payee1OldBalance = web3.eth.getBalance(payee1).toNumber();
            const payer1OldBalance = web3.eth.getBalance(payer1).toNumber();
            const payer2OldBalance = web3.eth.getBalance(payer2).toNumber();

            // home win
            let tx = await hs.setWinner(hid, 0, offchain, { from: root });
            const txHash = tx['receipt']['transactionHash'];
            const log = await web3.eth.getTransaction(txHash);

            const gasUsed = tx['receipt']['gasUsed'];
            const gasPrice = log['gasPrice'].toNumber();

            assert.equal(await oc(tx, '__setWinner', 'hid'), hid);
            const fee = await oc(tx, '__setWinner', 'fee').toNumber();
            assert.notEqual(fee, 0);

            const rootNewBalance = web3.eth.getBalance(root).toNumber();
            assert.equal(rootOldBalance + fee - (gasUsed * gasPrice), rootNewBalance);

            const payee1NewBalance = web3.eth.getBalance(payee1).toNumber();
            assert.notEqual(payee1OldBalance, payee1NewBalance);

            const payer1NewBalance = web3.eth.getBalance(payer1).toNumber();
            assert.equal(payer1NewBalance, payer1OldBalance);
            const payer2NewBalance = web3.eth.getBalance(payer2).toNumber();
            assert.equal(payer2NewBalance, payer2OldBalance);
        });
    }); 

    describe('private bet', () => {
        beforeEach( async () => {
            if (offchain !== 'cts_1') {
                await createBettingHandShakeWithAcceptors();
            }
        });

        it('init handshake', async () => {
            assert.equal(offchain, 'cts_1');
            assert.equal(hid, 0);
            assert.equal(state, 0);
    
            const bet = await hs.bets.call(0);
            assert.equal(bet[0], payee1);

            // create new one from another payee
            const info = {
                acceptors: [],
                escrow: web3.toWei(1),
                goal: web3.toWei(0.3),
                deadline: 86399,
                sender: payee2,
                offchain: 'cts_2',
            };

            let tx = await hs.initBet(info.acceptors, info.goal, info.escrow, info.deadline, info.offchain, { from: info.sender, value: info.escrow });
            const _hid = await oc(tx, '__init', 'hid').toNumber();
            const _offchain = await b2s(oc(tx, '__init', 'offchain'));

            assert.notEqual(_hid, hid);
            assert.notEqual(_offchain, offchain);

            const bets = await hs.getBets({ from: payee1 });
            assert.equal(bets.toNumber(), 3);
        });

        it('shake handshake', async () => {
            u.assertRevert(hs.shake('', hid, offchain, { from: payer1, value: web3.toWei(0.1) }));
            u.assertRevert(hs.shake('111', hid, offchain, { from: payer1, value: web3.toWei(0.1) }));

            // let tx = await hs.shake('1', hid, offchain, { from: payer1, value: web3.toWei(0.1) });
        
            // let balance = await oc(tx, '__shake', 'balance');
            // assert.equal(balance.toNumber(), 100000000000000000);
    
            // let value = await hs.getWinValue(hid, { from: payer1 });
            // assert.equal(value.toNumber(), 333333333333333300);
            
            // let bBalance = await hs.getBetBalance(hid, { from: root });
            // assert.equal(bBalance[1].toNumber(), 100000000000000000);
            // assert.equal(bBalance[0].toNumber(), 1);

            // tx = await hs.shake('', hid, offchain, { from: payer1, value: web3.toWei(0.1) });
            // balance = await oc(tx, '__shake', 'balance');
            // assert.equal(balance.toNumber(), 200000000000000000);

            // value = await hs.getWinValue(hid, { from: payer1 });
            // assert.equal(value.toNumber(), (333333333333333300 * 2));

            // bBalance = await hs.getBetBalance(hid, { from: root });
            // assert.equal(bBalance[1].toNumber(), 200000000000000000);
            // assert.equal(bBalance[0].toNumber(), 1);

            // tx = await hs.shake('', hid, offchain, { from: payer2, value: web3.toWei(0.1) });
            // balance = await oc(tx, '__shake', 'balance');
            // assert.equal(balance.toNumber(), 300000000000000000);

            // value = await hs.getWinValue(hid, { from: payer2 });
            // assert.equal(value.toNumber(), 333333333333333300);
            // bBalance = await hs.getBetBalance(hid, { from: payer2 });
            // assert.equal(bBalance[1].toNumber(), 300000000000000000);
            // assert.equal(bBalance[0].toNumber(), 2);
        });
    });
});
