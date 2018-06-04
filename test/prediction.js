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
                                closingTime: 10,
                                winningFee: 2,
                                reportTime: 10,
                                reportFee: 7,
                                source: s2b("livescore.com"),
                                reporter: reporter1,
                                disputeTime: 10,
                                creator: creator1 
                        }
                        const o = {
                                hid: 0
                        }

                        const tx = await hs.initMarket(i.closingTime, i.winningFee, i.reportTime, i.reportFee, i.source, i.reporter, i.disputeTime, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__initMarket", "hid"))
                })

                it('should create the second prediction market', async () => {
                        const i = {
                                closingTime: 10,
                                winningFee: 1,
                                reportTime: 10,
                                reportFee: 7,
                                source: s2b("livescore.com"),
                                reporter: reporter1,
                                disputeTime: 10,
                                reporter: reporter1,
                                creator: creator2 
                        }
                        const o = {
                                hid: 1
                        }

                        const tx = await hs.initMarket(i.closingTime, i.winningFee, i.reportTime, i.reportFee, i.source, i.reporter, i.disputeTime, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__initMarket", "hid"))
                })

        })

        describe('init/make orders', () => {

                it("should not init/make 1st order (market not shaked yet)", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                payout: web3.toWei(0.3),
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.payout
                        }
                        await u.assertRevert(hs.initOrder(i.hid, i.side, i.payout, OFFCHAIN, {from: i.sender, value: i.stake}))
                })

                it('should not shake market (wrong reporter)', async () => {
                        const i = {
                                hid: 1,
                                reporter: taker1 
                        }
                        const o = {
                                hid: 1
                        }

                        await u.assertRevert(hs.shakeMarket(i.hid, OFFCHAIN, { from: i.reporter}))
                })

                it('should shake market (correct reporter)', async () => {
                        const i = {
                                hid: 1,
                                reporter: reporter1 
                        }
                        const o = {
                                hid: 1
                        }

                        const tx = await hs.shakeMarket(i.hid, OFFCHAIN, { from: i.reporter})
                        eq(o.hid, await oc(tx, "__shakeMarket", "hid"))
                })

                it("should init/make 1st order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                payout: web3.toWei(0.3),
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.payout
                        }
                        const tx = await hs.initOrder(i.hid, i.side, i.payout, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__initOrder", "stake"))
                        eq(o.payout, await oc(tx, "__test__initOrder", "payout"))
                })

                it("should init/make 2nd order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                payout: web3.toWei(0.3),
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake * 2,
                                payout: i.payout * 2
                        }
                        const tx = await hs.initOrder(i.hid, i.side, i.payout, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__initOrder", "stake"))
                        eq(o.payout, await oc(tx, "__test__initOrder", "payout"))
                })

                it("should init/make 3rd order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                payout: web3.toWei(0.4),
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.payout
                        }
                        const tx = await hs.initOrder(i.hid, i.side, i.payout, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__initOrder", "stake"))
                        eq(o.payout, await oc(tx, "__test__initOrder", "payout"))
                })

                it("should uninit/cancel 3rd order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                payout: web3.toWei(0.4),
                                sender: maker2 
                        }
                        const o = {
                                stake: 0,
                                payout: 0
                        }
                        const tx = await hs.uninitOrder(i.hid, i.side, i.stake, i.payout, OFFCHAIN, {from: i.sender})
                        eq(o.stake, await oc(tx, "__test__uninitOrder", "stake"))
                        eq(o.payout, await oc(tx, "__test__uninitOrder", "payout"))
                })
        })

        describe('place take orders', () => {

                it("should place 1st take order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                payout: web3.toWei(0.3),
                                maker: maker1,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.payout,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: i.payout,
                                open_maker_stake: web3.toWei(0.1),
                                open_maker_payout: web3.toWei(0.3)
                        }
                        const tx = await hs.shakeOrder(i.hid, i.side, i.payout, i.maker, OFFCHAIN, {from: i.sender, value: i.stake})

                        eq(o.match_taker_stake, await oc(tx, "__test__shakeOrder__taker", "stake"))
                        eq(o.match_taker_payout, await oc(tx, "__test__shakeOrder__taker", "payout"))

                        eq(o.match_maker_stake, await oc(tx, "__test__shakeOrder__maker", "matched_stake"))
                        eq(o.match_maker_payout, await oc(tx, "__test__shakeOrder__maker", "matched_payout"))

                        eq(o.open_maker_stake, await oc(tx, "__test__shakeOrder__maker", "open_stake"))
                        eq(o.open_maker_payout, await oc(tx, "__test__shakeOrder__maker", "open_payout"))
                })


                /*
                it("should be Accepted when Payee deliver within deadline", async () => {
                        tx1 = await hs.deliver(hid1, OFFCHAIN, { from: owner1})
                        deliverHid1 = await oc(tx1, "__deliver", "hid")
                        eq(Number(hid1), Number(deliverHid1))

                        u.increaseTime(60 * 60 * 24 * deadline)
                        await u.assertRevert(hs.deliver(hid1, OFFCHAIN, { from: owner1 }));
                })

                it("should not be rejected", async () => {
                        await u.assertRevert(hs.reject(hid1, OFFCHAIN, { from: customer1 }))
                        await u.assertRevert(hs.reject(hid1, OFFCHAIN, { from: owner1 }))
                })

                it("should not be withdrawed", async () => {
                        await u.assertRevert(hs.withdraw(hid1, OFFCHAIN, { from: owner1 }));
                })

                it("should be able to canceled if deadline is over", async () => {
                        await u.assertRevert(hs.cancel(hid1, OFFCHAIN, { from: customer1 }))

                        u.increaseTime(60 * 60 * 24 * deadline)
                        tx1 = await hs.cancel(hid1, OFFCHAIN, { from: customer1 })
                        cancelHid1 = await oc(tx1, "__cancel", "hid")
                        eq(Number(hid1), Number(cancelHid1))
                })
                */
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
                                reporter: reporter1
                        }

                        u.increaseTime(60)

                        hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter})
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


/*

        describe('when a HandShake is Accepted', () => {
                beforeEach(async function () {
                        await createAcceptedHandshake()
                })

                it("should not be re-shaked", async () => {
                        await u.assertRevert(hs.shake(hid1, OFFCHAIN, { from: customer1, value: serviceValue }))
                })

                it("should be able to be rejected only by Payer", async () => {
                        tx1 = await hs.reject(hid1, OFFCHAIN, { from: customer1 })
                        rejectHid1 = await oc(tx1, "__reject", "hid")
                        eq(Number(hid1), Number(rejectHid1))

                        await u.assertRevert(hs.reject(hid1, OFFCHAIN, { from: owner1 }))

                })

                it("should be withdrawed after withdrawDate", async () => {
                        await u.assertRevert(hs.withdraw(hid1, OFFCHAIN, { from: owner1 }))

                        u.increaseTime(60 * 60 * 24 * (deadline + 7)) // 7: review
                        tx1 = await hs.withdraw(hid1, OFFCHAIN, { from: owner1 })
                        withdrawHid1 = await oc(tx1, "__withdraw", "hid")
                        eq(Number(hid1), Number(withdrawHid1))

                })

                it("should not be canceled", async () => {
                        await u.assertRevert(hs.cancel(hid1, OFFCHAIN, { from: customer1 }))
                })

        })

        describe('when a HandShake is Rejected', () => {
                beforeEach(async function () {
                        await createRejectedHandshake()
                })

                it("should not be re-shaked", async () => {
                        await u.assertRevert(hs.shake(hid1, OFFCHAIN, { from: customer1, value: serviceValue }))
                })

                it("should be able to be Accepted only by Payer", async () => {
                        tx1 = await hs.accept(hid1, OFFCHAIN, { from: customer1 })
                        acceptHid1 = await oc(tx1, "__accept", "hid")
                        eq(Number(hid1), Number(acceptHid1))

                        await u.assertRevert(hs.reject(hid1, OFFCHAIN, { from: owner1 }))

                })

                it("should not be withdrawed", async () => {
                        await u.assertRevert(hs.withdraw(hid1, OFFCHAIN, { from: owner1 }))

                })

                it("should be canceled after resolve time", async () => {
                        await u.assertRevert(hs.cancel(hid1, OFFCHAIN, { from: customer1 }))

                        u.increaseTime(60 * 60 * 24 * (deadline + 21)) // 21: review + resolve time
                        tx1 = await hs.cancel(hid1, OFFCHAIN, { from: customer1 })
                        cancelHid1 = await oc(tx1, "__cancel", "hid")
                        eq(Number(hid1), Number(cancelHid1))
                })
        })

        describe('when a HandShake is Canceled', () => {
                beforeEach(async function () {
                        await createCanceledHandshake()
                })

                it("should not call any action anymore", async () => {
                        await u.assertRevert(hs.shake(hid1, OFFCHAIN, { from: customer1, value: serviceValue }))

                        await u.assertRevert(hs.deliver(hid1, OFFCHAIN, { from: owner1 }))

                        await u.assertRevert(hs.reject(hid1, OFFCHAIN, { from: customer1 }))

                        await u.assertRevert(hs.cancel(hid1, OFFCHAIN, { from: customer1 }))

                        await u.assertRevert(hs.withdraw(hid1, OFFCHAIN, { from: owner1 }))

                        await u.assertRevert(hs.accept(hid1, OFFCHAIN, { from: customer1 }))
                })
        })

        describe('when a HandShake is Done', () => {
                beforeEach(async function () {
                        await createDoneHandshake()
                })

                it("should not call any action anymore", async () => {
                        await u.assertRevert(hs.shake(hid1, OFFCHAIN, { from: customer1, value: serviceValue }))

                        await u.assertRevert(hs.deliver(hid1, OFFCHAIN, { from: owner1 }))

                        await u.assertRevert(hs.reject(hid1, OFFCHAIN, { from: customer1 }))

                        await u.assertRevert(hs.cancel(hid1, OFFCHAIN, { from: customer1 }))

                        await u.assertRevert(hs.withdraw(hid1, OFFCHAIN, { from: owner1 }))

                        await u.assertRevert(hs.accept(hid1, OFFCHAIN, { from: customer1 }))
                })
        })
        */
})
