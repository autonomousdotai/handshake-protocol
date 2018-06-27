const p2p = artifacts.require("PredictionHandshake")
const u = require('./util.js')
const s2b = u.s2b
const oc = u.oc

contract("PredictionHandshake", (accounts) => {

        const root = accounts[0]
        const creator1 = accounts[1]
        const creator2 = accounts[2]
        const maker1 = accounts[3]
        const maker2 = accounts[4]
        const maker3 = accounts[5]
        const taker1 = accounts[6]
        const taker2 = accounts[7]
        const taker3 = accounts[8]
        const reporter1 = accounts[9]

        const SUPPORT = 1, AGAINST = 2
        const OFFCHAIN = 1

        let hs;

        before(async () => {
                hs = await p2p.deployed();
        })

        describe('test uninit for trial', () => {
            it('create a market', async() => {
                const i = {
                    fee: 0,
                    source: s2b("livescore.com"),
                    closingWindow: 1000,
                    reportWindow: 2000,
                    disputeWindow: 3000,
                    creator: creator1 
                }
                const o = {
                    hid: 0
                }

                const tx = await hs.createMarket(i.fee, i.source, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                assert.equal(o.hid, await oc(tx, "__createMarket", "hid"))
            });

            it('should be able to init test drive', async() => {
                const i = {
                    hid: 0,
                    side: SUPPORT,
                    odds: 100,
                    stake: web3.toWei(1, 'ether'),
                    maker: maker1,
                    creator: creator1
                }

                const tx = await hs.initTestDrive(i.hid, i.side, i.odds, i.maker, OFFCHAIN, { from: root, value: i.stake })
                const trial = await hs.getOpenData(i.hid, i.side, i.maker, i.odds);

                assert.equal(web3.toWei(1, 'ether'), trial[0].toNumber())
                assert.equal(web3.toWei(1, 'ether'), await oc(tx, "__test__init", "stake"))
            });

            it('should be able to uninit for trial', async() => {
                const i = {
                    hid: 0,
                    side: SUPPORT,
                    odds: 100,
                    maker: maker1,
                    value: web3.toWei(1, 'ether')
                }
              
                const tx = await hs.uninitTestDrive(i.hid, i.side, i.odds, i.maker, i.value, OFFCHAIN, { from: root })

                const total = await hs.total()
                const trial = await hs.getOpenData(i.hid, i.side, i.maker, i.odds);

                assert.equal(web3.toWei(1, 'ether'), total)
                assert.equal(0, trial[0].toNumber())
            })

            it('root is able to withdraw ether from trial total count', async() => {
                const total = await hs.total()
                const rootBalanceBefore = await web3.eth.getBalance(root)

                const tx = await hs.withdrawTrial({ from: root });
                const rootBalanceAfter = await web3.eth.getBalance(root)

                const expected = (rootBalanceBefore.toNumber() + total.toNumber()) / 10**18

                const realValue = rootBalanceAfter.toNumber() / 10**18

                assert.equal(Math.floor(expected), Math.floor(realValue))

                const totalAfter = await hs.total()

                assert.equal(0, totalAfter.toNumber())
            })
        });
})
