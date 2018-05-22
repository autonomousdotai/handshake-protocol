const p2p = artifacts.require("PayableHandshake")

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

contract("PayableHandshake", (accounts) => {
    const root = accounts[0]
    const owner1 = accounts[1]
    const owner2 = accounts[2]
    const owner3 = accounts[3]
    const employee1 = accounts[4]
    const employee2 = accounts[5]
    const employee3 = accounts[6]
    const customer1 = accounts[7]
    const customer2 = accounts[8]
    const customer3 = accounts[9]

    const serviceValue = web3.toWei(0.0001)
    let hs;

    before(async () => {
        hs = await p2p.deployed();
    })

    let tx1, hid1, shakeHid1, deliverHid1, cancelHid1, rejectHid1, withdrawHid1, acceptHid1
    let tx2, hid2, shakeHid2, deliverHid2, cancelHid2, rejectHid2, withdrawHid2, acceptHid2
    let deadline = 7, offchain = 1

    async function createHandShake(){
        tx1 = await hs.initByPayer(owner1, serviceValue, deadline, offchain, { from: customer1, value: serviceValue })
        hid1 = await oc(tx1, "__init", "hid")
        shakeHid1 = await oc(tx1, "__shake", "hid")
    }


    async function createAcceptedHandshake() {
        tx1 = await hs.initByPayer(owner1, serviceValue, deadline, offchain, { from: customer1, value: serviceValue })
        hid1 = await oc(tx1, "__init", "hid")
        shakeHid1 = await oc(tx1, "__shake", "hid")
        await hs.deliver(hid1, offchain, { from: owner1 })
    }

    async function createRejectedHandshake() {
        tx1 = await hs.initByPayer(owner1, serviceValue, deadline, offchain, { from: customer1, value: serviceValue })
        hid1 = await oc(tx1, "__init", "hid")
        shakeHid1 = await oc(tx1, "__shake", "hid")
        await hs.deliver(hid1, offchain, { from: owner1 })
        await hs.reject(hid1, offchain, { from: customer1 })
    }

    async function createCanceledHandshake() {
        tx1 = await hs.initByPayer(owner1, serviceValue, deadline, offchain, { from: customer1, value: serviceValue })
        hid1 = await oc(tx1, "__init", "hid")
        shakeHid1 = await oc(tx1, "__shake", "hid")
        await hs.deliver(hid1, offchain, { from: owner1 })
        await hs.reject(hid1, offchain, { from: customer1 })
        u.increaseTime(60 * 60 * 24 * (deadline + 21))
        await hs.cancel(hid1, offchain, { from: customer1 })
    }

    async function createDoneHandshake() {
        tx1 = await hs.initByPayer(owner1, serviceValue, deadline, offchain, { from: customer1, value: serviceValue })
        hid1 = await oc(tx1, "__init", "hid")
        shakeHid1 = await oc(tx1, "__shake", "hid")
        await hs.deliver(hid1, offchain, { from: owner1 })
        u.increaseTime(60 * 60 * 24 * (deadline + 21))
        await hs.withdraw(hid1, offchain, { from: owner1 })

    }

    describe('at any time', () => {

        it('should making Handshake when Payer call initByPayer', async () => {
            tx1 = await hs.initByPayer(owner1, serviceValue, deadline, offchain, { from: customer1, value: serviceValue })
            hid1 = await oc(tx1, "__init", "hid")
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))
        })

        it('should init a Handshake when Payee call init', async () => {
            tx2 = await hs.init(0, serviceValue, deadline, offchain, { from: owner1 })
            hid2 = await oc(tx2, "__init", "hid")
            as(!isNaN(hid2))
        })

        it('should making Handshake when Payer call shake to an inited Handshake', async () => {
            tx2 = await hs.shake(hid2, offchain, { from: customer2, value: serviceValue })
            shakeHid2 = await oc(tx2, "__shake", "hid")
            eq(Number(hid2), Number(shakeHid2))
        })

        it('should return incremental hid', async () => {
            eq(Number(hid1), 0)
            eq(Number(hid2), 1)
        })
    })

    describe('when a HandShake is Shaked', () => {
        beforeEach(async function(){
            await createHandShake()
        })

        it("should not be re-shaked", async () => {
            await u.assertRevert(hs.shake(hid1, offchain, { from: customer1, value: serviceValue }));
        })

        it("should be Accepted when Payee deliver within deadline", async () => {
            tx1 = await hs.deliver(hid1, offchain, { from: owner1})
            deliverHid1 = await oc(tx1, "__deliver", "hid")
            eq(Number(hid1), Number(deliverHid1))

            u.increaseTime(60 * 60 * 24 * deadline)
            await u.assertRevert(hs.deliver(hid1, offchain, { from: owner1 }));
        })

        it("should not be rejected", async () => {
            await u.assertRevert(hs.reject(hid1, offchain, { from: customer1 }))
            await u.assertRevert(hs.reject(hid1, offchain, { from: owner1 }))
        })

        it("should not be withdrawed", async () => {
            await u.assertRevert(hs.withdraw(hid1, offchain, { from: owner1 }));
        })

        it("should be able to canceled if deadline is over", async () => {
            await u.assertRevert(hs.cancel(hid1, offchain, { from: customer1 }))

            u.increaseTime(60 * 60 * 24 * deadline)
            tx1 = await hs.cancel(hid1, offchain, { from: customer1 })
            cancelHid1 = await oc(tx1, "__cancel", "hid")
            eq(Number(hid1), Number(cancelHid1))
        })
    })


    describe('when a HandShake is Accepted', () => {
        beforeEach(async function () {
            await createAcceptedHandshake()
        })

        it("should not be re-shaked", async () => {
            await u.assertRevert(hs.shake(hid1, offchain, { from: customer1, value: serviceValue }))
        })

        it("should be able to be rejected only by Payer", async () => {
            tx1 = await hs.reject(hid1, offchain, { from: customer1 })
            rejectHid1 = await oc(tx1, "__reject", "hid")
            eq(Number(hid1), Number(rejectHid1))

            await u.assertRevert(hs.reject(hid1, offchain, { from: owner1 }))

        })

        it("should be withdrawed after withdrawDate", async () => {
            await u.assertRevert(hs.withdraw(hid1, offchain, { from: owner1 }))

            u.increaseTime(60 * 60 * 24 * (deadline + 7)) // 7: review
            tx1 = await hs.withdraw(hid1, offchain, { from: owner1 })
            withdrawHid1 = await oc(tx1, "__withdraw", "hid")
            eq(Number(hid1), Number(withdrawHid1))

        })

        it("should not be canceled", async () => {
            await u.assertRevert(hs.cancel(hid1, offchain, { from: customer1 }))
        })

    })

    describe('when a HandShake is Rejected', () => {
        beforeEach(async function () {
            await createRejectedHandshake()
        })

        it("should not be re-shaked", async () => {
            await u.assertRevert(hs.shake(hid1, offchain, { from: customer1, value: serviceValue }))
        })

        it("should be able to be Accepted only by Payer", async () => {
            tx1 = await hs.accept(hid1, offchain, { from: customer1 })
            acceptHid1 = await oc(tx1, "__accept", "hid")
            eq(Number(hid1), Number(acceptHid1))

            await u.assertRevert(hs.reject(hid1, offchain, { from: owner1 }))

        })

        it("should not be withdrawed", async () => {
            await u.assertRevert(hs.withdraw(hid1, offchain, { from: owner1 }))

        })

        it("should be canceled after resolve time", async () => {
            await u.assertRevert(hs.cancel(hid1, offchain, { from: customer1 }))

            u.increaseTime(60 * 60 * 24 * (deadline + 21)) // 21: review + resolve time
            tx1 = await hs.cancel(hid1, offchain, { from: customer1 })
            cancelHid1 = await oc(tx1, "__cancel", "hid")
            eq(Number(hid1), Number(cancelHid1))
        })
    })

    describe('when a HandShake is Canceled', () => {
        beforeEach(async function () {
            await createCanceledHandshake()
        })

        it("should not call any action anymore", async () => {
            await u.assertRevert(hs.shake(hid1, offchain, { from: customer1, value: serviceValue }))

            await u.assertRevert(hs.deliver(hid1, offchain, { from: owner1 }))

            await u.assertRevert(hs.reject(hid1, offchain, { from: customer1 }))

            await u.assertRevert(hs.cancel(hid1, offchain, { from: customer1 }))

            await u.assertRevert(hs.withdraw(hid1, offchain, { from: owner1 }))

            await u.assertRevert(hs.accept(hid1, offchain, { from: customer1 }))
        })
    })

    describe('when a HandShake is Done', () => {
        beforeEach(async function () {
            await createDoneHandshake()
        })

        it("should not call any action anymore", async () => {
            await u.assertRevert(hs.shake(hid1, offchain, { from: customer1, value: serviceValue }))

            await u.assertRevert(hs.deliver(hid1, offchain, { from: owner1 }))

            await u.assertRevert(hs.reject(hid1, offchain, { from: customer1 }))

            await u.assertRevert(hs.cancel(hid1, offchain, { from: customer1 }))

            await u.assertRevert(hs.withdraw(hid1, offchain, { from: owner1 }))

            await u.assertRevert(hs.accept(hid1, offchain, { from: customer1 }))
        })
    })
})
