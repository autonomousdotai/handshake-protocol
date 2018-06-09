const p2p = artifacts.require("PredictionHandshake")

const l = console.log
const eq = assert.equal
const neq = assert.notEqual
const as = assert

const u = require('./util.js')
const b2s = u.b2s
const s2b = u.s2b
const s2ba = u.s2ba
const b2sa = u.b2sa
const oc = u.oc
const poc = u.poc
const paoc = u.paoc
const ca = u.ca

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

        describe('create two prediction markets', () => {

                it('should create the first prediction market', async () => {
                        const i = {
                                fee: 2,
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

                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it('should create the second prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 1
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

        })

        describe('init/make orders', () => {

                it("should init/make 1st order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                        eq(o.payout, await oc(tx, "__test__init", "payout"))
                })

                it("should init/make 2nd order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake * 2,
                                payout: i.stake * 2 * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                        eq(o.payout, await oc(tx, "__test__init", "payout"))
                })

                it("should init/make 3rd order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                odds: 400,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                        eq(o.payout, await oc(tx, "__test__init", "payout"))
                })

                it("should uninit/cancel 3rd order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                odds: 400,
                                sender: maker2 
                        }
                        const o = {
                                stake: 0,
                                payout: 0
                        }
                        const tx = await hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, {from: i.sender})
                        eq(o.stake, await oc(tx, "__test__uninit", "stake"))
                        eq(o.payout, await oc(tx, "__test__uninit", "payout"))
                })
        })

        describe('place take orders', () => {

                it("should place 1st take order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker1,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: i.payout,
                                open_maker_stake: web3.toWei(0.1),
                                open_maker_payout: web3.toWei(0.3)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})

                        eq(o.match_taker_stake, await oc(tx, "__test__shake__taker", "stake"))
                        eq(o.match_taker_payout, await oc(tx, "__test__shake__taker", "payout"))

                        /*
                        eq(o.match_maker_stake, await oc(tx, "__test__shake__maker", "matched_stake"))
                        eq(o.match_maker_payout, await oc(tx, "__test__shake__maker", "matched_payout"))

                        eq(o.open_maker_stake, await oc(tx, "__test__shake__maker", "open_stake"))
                        eq(o.open_maker_payout, await oc(tx, "__test__shake__maker", "open_payout"))
                        */
                })
        })

        describe('collect payouts', () => {

                it("should not be able to collect payout (no report yet)", async () => {
                        const i = {
                                hid: 1,
                                trader: maker1
                        }
                        await u.assertRevert(hs.collect(i.hid, OFFCHAIN, {from: i.trader}))
                })
        })


        describe('report outcome', () => {

                it("should not be able to report outcome (not a reporter)", async () => {
                        const i = {
                                hid: 1,
                                reporter: maker1
                        }
                        await u.assertRevert(hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter}))
                })

                it("should report outcome", async () => {
                        const i = {
                                hid: 1,
                                reporter: creator2
                        }

                        u.increaseTime(60)

                        const tx = await hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter})

                })


        })

        describe('collect payouts', () => {

                it("should collect payout (report is now available)", async () => {
                        const i = {
                                hid: 1,
                                trader: maker1
                        }
                        const o = {
                                networkComm: web3.toWei(.0006),
                                marketComm: web3.toWei(.0024),
                                payout: web3.toWei(.3 + .1 - .003) // .3 payout .1 stake
                        }

                        const tx = await hs.collect(i.hid, OFFCHAIN, {from: i.trader})
                        eq(o.networkComm, await oc(tx, "__test__collect", "network"))
                        eq(o.marketComm, await oc(tx, "__test__collect", "market"))
                        eq(o.payout, await oc(tx, "__test__collect", "trader"))
                })

                it("should not be able to collect payout (already did)", async () => {
                        const i = {
                                hid: 1,
                                trader: maker1
                        }
                        await u.assertRevert(hs.collect(i.hid, OFFCHAIN, {from: i.trader}))
                })
        })


})
