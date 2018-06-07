const p2p = artifacts.require("ExchangeHandshake")

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

contract("ExchangeHandshake", (accounts) => {
    const root = accounts[0]
    const coinOwner1 = accounts[1]
    const coinOwner2 = accounts[2]
    const cashOwner1 = accounts[3]
    const cashOwner2 = accounts[4]
    const exchanger1 = accounts[5]
    const exchanger2 = accounts[6]
    const initiatorFeeRefund1 = accounts[7]
    const initiatorFeeRefund2 = accounts[8]
    const initiatorFeeRefund3 = accounts[9]

    let serviceValue = web3.toWei(0.5)
    const fee = 5
    const feeRefund = 5
    const zeroValue = web3.toWei(0)

    let hs;

    before(async () => {
        hs = await p2p.deployed();
        //console.log(await hs.owner({}));
    })

    let tx1, hid1, shakeHid1, fee1, cancelHid1, rejectHid1, withdrawHid1, acceptHid1
    let tx2, hid2, shakeHid2, fee2, cancelHid2, rejectHid2, withdrawHid2, acceptHid2
    let offchain = 1

    describe('at beginning time', () => {
        it('should set exchange fee successful', async () => {
            //eq(await hs.owner({}), root)

            tx1 = await hs.setFee(fee, feeRefund, { from: root })
            fee1 = await oc(tx1, "__setFee", "feeRefund")
            eq(Number(fee1), feeRefund)
        })

        it('should not able set exchange fee by normal user', async () => {
            //eq(await hs.owner({}), root)
            await  u.assertRevert(hs.setFee(fee, feeRefund, { from: coinOwner1 }))
        })
    })


    describe('at beginning time', () => {
        it('should making Handshake when coinOwner call initByPayer', async () => {
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")

            eq(Number(hid1), 0)
            as(!isNaN(hid1))
        })

        it('should init a Handshake when cashOwner call init', async () => {
            tx2 = await hs.initByCashOwner(exchanger2,initiatorFeeRefund2, serviceValue, offchain, { from: cashOwner2 })
            hid2 = await oc(tx2, "__initByCashOwner", "hid")
            eq(Number(hid2), 1)
            as(!isNaN(hid2))
        })

        it('should making Handshake when cashOwner call shake to an inited Handshake', async () => {
            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))
        })

        it('should making Handshake when coinOwner call shake to an inited Handshake', async () => {
            let amount = Number(serviceValue) + (Number(serviceValue)*(fee+feeRefund))/1000
            console.log("-----------------" + serviceValue);
            tx2 = await hs.shake(hid2, offchain, { from: coinOwner2, value: amount })
            shakeHid2 = await oc(tx2, "__shake", "hid")
            let amountLog = await oc(tx2, "__shake", "amount")
            console.log(Number(amountLog));
            eq(Number(hid2), Number(shakeHid2))
        })


        it('should return incremental hid', async () => {
            eq(Number(hid1), 0)
            eq(Number(hid2), 1)
        })

        it("should be not able to accept by cashOwner", async () => {
            await  u.assertRevert(hs.accept(hid1, offchain, { from: cashOwner1 }))
        })

        it("should be able to accept by coinOwner", async () => {
            tx1 = await hs.accept(hid1, offchain, { from: coinOwner1 })
            acceptHid1 = await oc(tx1, "__accept", "hid")
            eq(Number(hid1), Number(acceptHid1))
        })

        it("should be not able to withdraw by coinOwner", async () => {
            await  u.assertRevert(hs.withdraw(hid1, offchain, { from: coinOwner1 }))
        })

        it("should be able to withdraw by cashOwner", async () => {

            tx1 = await hs.withdraw(hid1, offchain, { from: cashOwner1 })
            withdrawHid1 = await oc(tx1, "__withdraw", "hid")
            eq(Number(hid1), Number(withdrawHid1))

            let value = await oc(tx1, "__withdraw", "value")
            let fee = await oc(tx1, "__withdraw", "fee")
            let feeRefund = await oc(tx1, "__withdraw", "feeRefund")
            console.log("value:" + Number(value) + "fee:" + Number(fee) + "feeRefund"+ Number(feeRefund))


        })



        it("should be able to accept only by coinOwner for handshake 2", async () => {
            tx2 = await hs.accept(hid2, offchain, { from: coinOwner2 })
            acceptHid2 = await oc(tx2, "__accept", "hid")
            eq(Number(hid2), Number(acceptHid2))

            tx2 = await hs.withdraw(hid2, offchain, { from: cashOwner2 })

        })

        it("should be not able to withdraw by coinOwner for handshake 2", async () => {
            await  u.assertRevert(hs.withdraw(hid2, offchain, { from: coinOwner2 }))
        })

        it("should be received fee & fee refund after withdraw with init by CashOwner", async () => {
            let blb1= u.balance(initiatorFeeRefund1);
            let blb2= u.balance(coinOwner1);
            let blb3= u.balance(exchanger1);

            let amount = Number(serviceValue) + (Number(serviceValue)*(5+5))/1000
            tx1 = await hs.initByCashOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: cashOwner1 })
            console.log("amount:" + Number(amount));
            hid1 = await oc(tx1, "__initByCashOwner", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: coinOwner1, value: amount})
            let amountLog = await oc(tx1, "__shake", "amount")
            console.log("amountL" + Number(amountLog));

            tx1 = await hs.accept(hid1, offchain, { from: coinOwner1 })
            tx1 = await hs.withdraw(hid1, offchain, { from: cashOwner1 })

            withdrawHid1 = await oc(tx1, "__withdraw", "hid")
            //let value = await oc(tx1, "__withdraw", "value")
            //let fee = await oc(tx1, "__withdraw", "fee")
            //let feeRefund = await oc(tx1, "__withdraw", "feeRefund")
            //console.log("value:" + Number(value) + "fee:" + Number(fee) + "feeRefund"+ Number(feeRefund))


            let bla1= u.balance(initiatorFeeRefund1);
            let bla2= u.balance(coinOwner1);
            let bla3= u.balance(exchanger1);

            //eq(Number((serviceValue*fee)/1000), Number(bla3)-Number(blb3))
            //eq(Number((serviceValue*feeRefund)/1000), Number(bla1)-Number(blb1))


        })

        it("should be received fee & fee refund after withdraw with init by CashOwner", async () => {
            let blb1= u.balance(initiatorFeeRefund1);
            let blb2= u.balance(coinOwner1);
            let blb3= u.balance(exchanger1);

            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            //console.log("amountL" + Number(amountLog));

            tx1 = await hs.accept(hid1, offchain, { from: coinOwner1 })
            tx1 = await hs.withdraw(hid1, offchain, { from: cashOwner1 })

            withdrawHid1 = await oc(tx1, "__withdraw", "hid")
            //let value = await oc(tx1, "__withdraw", "value")
            //let fee = await oc(tx1, "__withdraw", "fee")
            //let feeRefund = await oc(tx1, "__withdraw", "feeRefund")
            //console.log("value:" + Number(value) + "fee:" + Number(fee) + "feeRefund"+ Number(feeRefund))


            let bla1= u.balance(initiatorFeeRefund1);
            let bla2= u.balance(coinOwner1);
            let bla3= u.balance(exchanger1);

            //eq(Number((serviceValue*fee)/1000), Number(bla3)-Number(blb3))
            //eq(Number((serviceValue*feeRefund)/1000), Number(bla1)-Number(blb1))


        })

        it("should be able to reject by cashOwner", async () => {
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")
            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")

            tx1 = await hs.reject(hid1, offchain, { from: cashOwner1 })

            rejectHid1 = await oc(tx1, "__reject", "hid")
            eq(Number(hid1), Number(rejectHid1))

        })


        it("should be able to cancel by coinOwner at reject stage", async () => {
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")
            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            await hs.reject(hid1, offchain, { from: cashOwner1 })

            tx1 = await hs.cancel(hid1, offchain, { from: coinOwner1 })

            cancelHid1 = await oc(tx1, "__cancel", "hid")
            eq(Number(hid1), Number(cancelHid1))

        })

        it("should be able to cancel by coinOwner at shaked stage", async () => {
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")
            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")

            tx1 = await hs.cancel(hid1, offchain, { from: coinOwner1 })

            cancelHid1 = await oc(tx1, "__cancel", "hid")
            eq(Number(hid1), Number(cancelHid1))

            tx1 = await hs.getState(hid1)
            eq(5, Number(tx1)) //5:cancel stage

        })

        it("should get back coin after cancel", async () => {
            let blb2= u.balance(coinOwner1)
            //console.log(Number(blb2))

            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")

            //console.log(Number(u.balance(coinOwner1)))


            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")

            tx1 = await hs.cancel(hid1, offchain, { from: coinOwner1 })

            cancelHid1 = await oc(tx1, "__cancel", "hid")

            let bla2= u.balance(coinOwner1)
            //console.log(Number(bla2))
            //console.log(Number(bla2)-Number(blb2))
            //console.log(serviceValue)
            //eq(20311899999993856, Number(blb2)-Number(bla2))//20308000000000000 gas fee

        })

        it("should able to can cancel after init", async () => {
            let blb2= u.balance(coinOwner1)
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")

            tx1 = await hs.cancel(hid1, offchain, { from: coinOwner1 })

            cancelHid1 = await oc(tx1, "__cancel", "hid")

            let bla2= u.balance(coinOwner1)
           // eq(21842400000000000, Number(blb2)-Number(bla2))//20308000000000000 gas fee

        })


        it("should able to can close after init", async () => {
            tx1 = await hs.initByCashOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: cashOwner1 })
            hid1 = await oc(tx1, "__initByCashOwner", "hid")

            tx1 = await hs.closeByCashOwner(hid1, offchain, { from: cashOwner1 })

            cancelHid2 = await oc(tx1, "__closeByCashOwner", "hid")
            eq(Number(hid1), Number(cancelHid2))
        })

        it("should get low gas fee", async () => {
            let blb1= u.balance(coinOwner1)
            //console.log(Number(blb2))
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCoinOwner", "hid")
            let bla1= u.balance(coinOwner1)
            console.log(Number(blb1)-Number(bla1)-serviceValue)

             blb2= u.balance(cashOwner1)

            tx1 = await hs.shake(hid1, offchain, { from: cashOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")

             bla2= u.balance(cashOwner1)
            //console.log(Number(blb2)-Number(bla2))

        })

        it("should get low gas fee", async () => {
            let blb1= u.balance(cashOwner1)
            //console.log(Number(blb2))
            tx1 = await hs.initByCashOwner(exchanger1,initiatorFeeRefund1, serviceValue, offchain, { from: cashOwner1 })
            hid1 = await oc(tx1, "__initByCashOwner", "hid")
            let bla1= u.balance(cashOwner1)
            //console.log(Number(blb1)-Number(bla1))

            blb2= u.balance(coinOwner1)

            tx1 = await hs.shake(hid1, offchain, { from: coinOwner1, value: serviceValue })
            shakeHid1 = await oc(tx1, "__shake", "hid")

            bla2= u.balance(coinOwner1)
            //console.log(Number(blb2)-Number(bla2)-serviceValue)
            //console.log(serviceValue);

        })


    })


})
