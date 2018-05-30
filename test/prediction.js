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

        const DEADLINE = 3
        const MAKER = 1, TAKER = 2
        const SUPPORT = 1, AGAINST = 2
        const OFFCHAIN = 1

        let hs;

        before(async () => {
                hs = await p2p.deployed();
        })

        describe('create two test prediction markets', () => {

                it('should create the first prediction market', async () => {
                        const tx = await hs.init(DEADLINE, OFFCHAIN, { from: creator1 })
                        eq(0, await oc(tx, "__init", "hid"))
                })

                it('should create the second prediction market', async () => {
                        const tx = await hs.init(DEADLINE, OFFCHAIN, { from: creator2 })
                        eq(1, await oc(tx, "__init", "hid"))
                })
        })

        describe('place make orders', () => {

                it("should place 1st make order", async () => {
                        const i = {
                                hid: 1,
                                role: MAKER,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                payout: web3.toWei(0.3),
                                maker: 0,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.payout
                        }
                        const tx = await hs.shake(i.hid, i.role, i.side, i.payout, i.maker, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__debug__make", "stake"))
                        eq(o.payout, await oc(tx, "__debug__make", "payout"))
                })

                it("should place 2nd make order)", async () => {
                        const i = {
                                hid: 1,
                                role: MAKER,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                payout: web3.toWei(0.3),
                                maker: 0,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake * 2,
                                payout: i.payout * 2
                        }
                        const tx = await hs.shake(i.hid, i.role, i.side, i.payout, i.maker, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__debug__make", "stake"))
                        eq(o.payout, await oc(tx, "__debug__make", "payout"))
                })
        })

        describe('place take orders', () => {

                it("should place 1st take order)", async () => {
                        const i = {
                                hid: 1,
                                role: TAKER,
                                side: AGAINST, 
                                stake: web3.toWei(0.1),
                                payout: web3.toWei(0.3),
                                maker: maker1,
                                sender: taker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.payout
                        }
                        const tx = await hs.shake(i.hid, i.role, i.side, i.payout, i.maker, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__debug__take", "stake"))
                        eq(o.payout, await oc(tx, "__debug__take", "payout"))
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
