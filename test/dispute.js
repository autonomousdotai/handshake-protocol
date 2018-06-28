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

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        before(async () => {
                hs = await p2p.deployed();
        })

        describe('test dispute logic', () => {
            it('create a market', async() => {
                const i = {
                    fee: 1,
                    source: s2b("livescore.com"),
                    closingWindow: 10,
                    reportWindow: 10,
                    disputeWindow: 10,
                    creator: creator1 
                }
                const o = {
                    hid: 0
                }

                const tx = await hs.createMarket(i.fee, i.source, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                assert.equal(o.hid, await oc(tx, "__createMarket", "hid"))
            });

            it("maker1 place an order", async () => {
                const i = {
                    hid: 0,
                    side: SUPPORT, 
                    stake: web3.toWei(0.1, 'ether'),
                    odds: 300,
                    sender: maker1 
                }
                const o = {
                    stake: i.stake,
                    payout: i.stake * i.odds / 100
                }
                const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                assert.equal(o.stake, await oc(tx, "__test__init", "stake"))
                // eq(o.payout, await oc(tx, "__test__init", "payout"))
            })

            it("taker1 fill maker1 order", async() => {
                const i = {
                    hid: 0,
                    side: AGAINST,
                    taker: taker1,
                    takerOdds: 150,
                    value: web3.toWei('0.2', 'ether'),
                    maker: maker1,
                    makerOdds: 300
                }
                const o = {
                    match_taker_stake: i.value,
                    match_taker_payout: i.value * i.takerOdds / 100,
                    match_maker_stake: web3.toWei(0.1, 'ether'),
                    match_maker_payout: web3.toWei(0.1, 'ether') * i.makerOdds / 100,
                    open_maker_stake: web3.toWei(0)
                }
                const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, { from: i.taker, value: i.value });
                
                assert.equal(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"))
                assert.equal(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"))

                assert.equal(o.match_maker_stake, await oc(tx, "__test__shake__maker__matched", "stake"))
                assert.equal(o.match_maker_payout, await oc(tx, "__test__shake__maker__matched", "payout"))

                assert.equal(o.open_maker_stake, await oc(tx, "__test__shake__maker__open", "stake"))
            });

            it('creator reports an outcome on order', async () => {
                const i = {
                    hid: 0,
                    creator: creator1,
                    outcome: 1
                }

                await sleep(12000);

                await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator });

                var marketState = await hs.markets(0, { from: root });

                assert.equal(2, marketState[6].toNumber())
            });

            it('maker1 dispute the outcome', async () => {
                const i = {
                    hid: 0
                }

                await sleep(12000);

                const tx = await hs.dispute(i.hid, OFFCHAIN, { from: maker1 });

                const marketState = await hs.markets(0, { from: root });

                assert.equal(web3.toWei(0.1, 'ether'), marketState[10].toNumber())
            });
        }); 
})
