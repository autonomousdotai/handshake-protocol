const p2p = artifacts.require('GroupHandshake');
const assert = require('assert');

const u = require('./util.js');
var oc = u.oc;
const b2s = u.b2s;
const s2b = u.s2b;


contract('GroupHandshake', (accounts) => {
    const root = accounts[0];
    const owner1 = accounts[1];
    const owner2 = accounts[2];
    const owner3 = accounts[3];
    const employee1 = accounts[4];
    const employee2 = accounts[5];
    const employee3 = accounts[6];
    const customer1 = accounts[7];
    const customer2 = accounts[8];
    const customer3 = accounts[9];

    let hs;

    before(async () => {
        hs = await p2p.deployed();
    })

    let tx1, hid1;
    let tx2, hid2;
    let offchain = 1;

    const S = {
        'Inited': 0,
        'Shaked': 1,
        'Done': 2
     };

    describe('at any time', () => {
        it('should be able to initiate handshake from first entity', async () => {
            const acceptors = ['1', '2'];
            tx1 = await hs.init(acceptors, offchain, { from: owner1 });
            const hash = tx1['receipt']['transactionHash']; 
            
            const re = await web3.eth.getTransactionReceipt(hash);
            hid1 = await oc(tx1, '__init', 'hid');
            assert.ok(!isNaN(hid1));
            assert.equal(re['status'], 1);
        });
;
        it('should return incremental hid', async () => {
            const acceptors = [];
            tx1 = await hs.init(acceptors, offchain, { from: owner2 });
            hid1 = await oc(tx1, '__init', 'hid');
            tx2 = await hs.init(acceptors, offchain, { from: owner3 });
            hid2 = await oc(tx2, '__init', 'hid');
            assert.equal(Number(hid1), Number(hid2) - 1);
        });
    });

    describe('when inited', () => {
        it('should be able to make handshake from second entity', async () => {
            let acceptors = ['0x123', '0x1234'];
            tx1 = await hs.init(acceptors, offchain, { from: owner1 });
            hid1 = await oc(tx1, '__init', 'hid');

            tx2 = await hs.shake(hid1, '0x123', offchain, { from: owner2 });
            hid2 = await oc(tx2, '__shake', 'hid');
            assert.equal(Number(hid1), Number(hid2));

            let handshakeOf = await hs.handshakes(hid1);
            let remainingShakers = handshakeOf[1];
            let state = handshakeOf[2];

            await u.assertRevert(hs.shake(hid1, '0x123', offchain, { from: customer3 }));

            assert.equal(remainingShakers.toNumber(), 1);
            assert.equal(state.toNumber(), S['Shaked']);

            tx2 = await hs.shake(hid1, '0x1234', offchain, { from: owner2 });
            hid2 = await oc(tx2, '__shake', 'hid');
            assert.equal(Number(hid1), Number(hid2));

            handshakeOf = await hs.handshakes(hid2);
            remainingShakers = handshakeOf[1];
            state = handshakeOf[2];

            assert.equal(remainingShakers.toNumber(), 0);
            assert.equal(state.toNumber(), S['Done']);
            await u.assertRevert(hs.shake(hid2, '0x1234', offchain, { from: customer3 }));

            acceptors = [];
            tx1 = await hs.init(acceptors, offchain, { from: owner2 });
            hid1 = await oc(tx1, '__init', 'hid');

            tx2 = await hs.shake(hid1, '1', offchain, { from: owner2 });
            hid2 = await oc(tx2, '__shake', 'hid');
            assert.equal(Number(hid1), Number(hid2));

            await u.assertRevert(hs.shake(hid1, '2', offchain, { from: customer3 }));
            await u.assertRevert(hs.shake(hid1, '1', offchain, { from: owner2 }));
        });

        it('should fail to shake if acceptor does not match', async () => {
            const acceptors = ['1', '2'];
            tx1 = await hs.init(acceptors, offchain, { from: owner1 });
            hid1 = await oc(tx1, '__init', 'hid');

            try {
                await hs.shake(hid1, '3', offchain, { from: customer3 });
                assert.fail();
            } catch(e) {
                console.log('Cannot shake')
            }
        });

        it('should update done when enough shakers', async () => {
            const acceptors = ['1', '2'];
            const t1 = await hs.init(acceptors, offchain, { from: owner1 });
            const h1 = await oc(t1, '__init', 'hid');

            assert.equal((await hs.handshakes(h1))[1], 2);

            const t2 = await hs.shake(h1, '1', offchain, { from: owner2 });
            let state = await oc(t2, '__shake', 'state');

            const t3 = await hs.shake(h1, '2', offchain, { from: owner3 });
            state = await oc(t3, '__shake', 'state');

            assert.equal(state.toNumber(), S['Done']);
        })
    })
})
