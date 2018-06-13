const exs = artifacts.require("ExchangeShop")

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
    const shopOwner1 = accounts[1]
    const shopOwner2 = accounts[2]
    const shopOwner3 = accounts[6]
    const customer1 = accounts[3]
    const customer2 = accounts[4]
    const customer3 = accounts[5]

    let serviceValue = web3.toWei(1)
    let partialValue = web3.toWei(0.4)
    let partialValue2 = web3.toWei(0.2)


    const zeroValue = web3.toWei(0)
    const fee = 10 //1%
    let hs;

    before(async () => {
        hs = await exs.deployed();
    })

    let tx1, hid1, shakeHid1, fee1, cancelHid1, rejectHid1, finishHid1, acceptHid1
    let tx2, hid2, shakeHid2, fee2, cancelHid2, rejectHid2, finishHid2, acceptHid2
    let offchain = 1
    let offchain2 = 11

    describe('at shop owner create the offer', () => {
        it('should set exchange fee successful', async () => {

            tx1 = await hs.setFee(fee, { from: root })
            fee1 = await oc(tx1, "__setFee", "fee")
            eq(Number(fee1), fee)
        })
        it('should transfer coin successful', async () => {

            tx1 = await hs.initByShopOwner(offchain, { from: shopOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner1})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1)-Number(amount1)*fee/1000)

        })

        it('should not able to transfer coin when escrow < partialFund', async () => {

            tx1 = await hs.initByShopOwner(offchain, { from: shopOwner1, value: serviceValue })
            tx2 = await hs.initByShopOwner(offchain, { from: shopOwner2, value: serviceValue })

            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            //the first time
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner1})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //second times
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner1})
            releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //third times
            await u.assertRevert(hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner1}))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1)*2-2*(Number(amount1)*fee/1000))

        })

        it('should change stage to done when transfer all coin in escrow', async () => {
            tx1 = await hs.setFee(0, { from: root })

            tx1 = await hs.initByShopOwner(offchain, { from: shopOwner3, value: serviceValue })

            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            //the first time
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner3})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //second times
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner3})
            releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //third times
            tx1 = await hs.releasePartialFund(hid1, customer1, partialValue2, offchain, offchain2, { from: shopOwner3})

            tx1 = await hs.getBalance(hid1, { from: shopOwner3})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1)*2 - Number(partialValue2))
            eq(Number(tx1), 0)

            tx1 = await hs.getState(hid1)
            eq(4, Number(tx1)) //4:done stage

            await u.assertRevert(hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner3}))


        })

        it('should not able to transfer coin by another one', async () => {

            tx1 = await hs.initByShopOwner(offchain, { from: shopOwner1, value: serviceValue })
            tx2 = await hs.initByShopOwner(offchain, { from: shopOwner2, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            hid2 = await oc(tx2, "__initByShopOwner", "hid")

            await u.assertRevert(hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: customer1}))
            await u.assertRevert(hs.releasePartialFund(hid2,customer2,partialValue, offchain,offchain2, { from: customer1}))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            eq(Number(tx1), Number(serviceValue))

            tx2 = await hs.getBalance(hid2, { from: shopOwner1})
            eq(Number(tx2), Number(serviceValue))

        })

        it('should cancel successful', async () => {

            tx1 = await hs.initByShopOwner(offchain, { from: shopOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            tx1 = await hs.cancel(hid1,offchain, { from: shopOwner1})
            let cancelHid1 = await oc(tx1, "__cancel", "hid")

            eq(Number(hid1), Number(cancelHid1))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            eq(Number(tx1), 0)

        })

        it('should not able to cancel by customer', async () => {

            tx1 = await hs.initByShopOwner(offchain, { from: shopOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            await u.assertRevert(hs.cancel(hid1,offchain, { from: customer1}))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            eq(Number(tx1), Number(serviceValue))

        })

    })

    describe('at customer create the offer', () => {
        it('should set exchange fee successful', async () => {

            tx1 = await hs.setFee(fee, { from: root })
            fee1 = await oc(tx1, "__setFee", "fee")
            eq(Number(fee1), fee)
        })

        it('should init & shake successful', async () => {

            tx1 = await hs.initByCustomer(shopOwner1, offchain, { from: customer1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: shopOwner1})
            let shakeHid1 = await oc(tx1, "__shake", "hid")

            eq(Number(hid1), Number(shakeHid1))

        })

        it('should transfer coin successful', async () => {

            tx1 = await hs.initByCustomer(shopOwner1, offchain, { from: customer1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: shopOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))

            let blb1= u.balance(shopOwner1)

            tx1 = await hs.finish(hid1, offchain, { from: customer1})
            finishHid1 = await oc(tx1, "__finish", "hid")
            eq(Number(hid1), Number(finishHid1))

            let bla1= u.balance(shopOwner1)
            eq(Number(blb1)+ Number(serviceValue)-Number(serviceValue)*fee/1000, Number(bla1))

        })

        it('should not able to transfer coin by Shop Owner', async () => {

            tx1 = await hs.initByCustomer(shopOwner1, offchain, { from: customer2, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: shopOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))

            await u.assertRevert(hs.finish(hid1, offchain, { from: shopOwner1}))

        })

        it('should reject after shook by customer successful', async () => {

            tx1 = await hs.initByCustomer(shopOwner1, offchain, { from: customer2, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: shopOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))

            tx1 = await hs.reject(hid1, offchain, { from: customer2})
            rejectHid1 = await oc(tx1, "__reject", "hid")
            eq(Number(hid1), Number(rejectHid1))

            tx1 = await hs.getState(hid1)
            eq(2, Number(tx1)) //5:rejected stage

        })

        it('should reject after shook by shop owner successful', async () => {

            tx1 = await hs.initByCustomer(shopOwner3, offchain, { from: customer2, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            tx1 = await hs.shake(hid1, offchain, { from: shopOwner3})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))

            tx1 = await hs.reject(hid1, offchain, { from: shopOwner3})
            rejectHid1 = await oc(tx1, "__reject", "hid")
            eq(Number(hid1), Number(rejectHid1))

            tx1 = await hs.getState(hid1)
            eq(2, Number(tx1)) //2:rejected stage

        })
    })

})
