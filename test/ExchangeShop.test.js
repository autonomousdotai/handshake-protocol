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

    const zeroValue = web3.toWei(0)

    let hs;

    before(async () => {
        hs = await exs.deployed();
    })

    let tx1, hid1, shakeHid1, fee1, cancelHid1, rejectHid1, finishHid1, acceptHid1
    let tx2, hid2, shakeHid2, fee2, cancelHid2, rejectHid2, finishHid2, acceptHid2
    let offchain = 1
    let offchain2 = 11

    describe('at beginning time', () => {
        it('should transfer coin successful', async () => {

            tx1 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: shopOwner1})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1))

        })

        it('should not able transfer coin when escrow < partialFund', async () => {

            tx1 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner1, value: serviceValue })
            tx2 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner2, value: serviceValue })

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

            eq(Number(tx1), Number(serviceValue)-Number(amount1)*2)

        })

        it('should not able transfer coin by customer', async () => {

            tx1 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner1, value: serviceValue })
            tx2 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner2, value: serviceValue })
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

            tx1 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            tx1 = await hs.cancel(hid1,offchain, { from: shopOwner1})
            let cancelHid1 = await oc(tx1, "__cancel", "hid")

            eq(Number(hid1), Number(cancelHid1))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            eq(Number(tx1), 0)

        })

        it('should not able cancel by customer', async () => {

            tx1 = await hs.initByShopOwner(serviceValue, offchain, { from: shopOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByShopOwner", "hid")
            await u.assertRevert(hs.cancel(hid1,offchain, { from: customer1}))

            tx1 = await hs.getBalance(hid1, { from: shopOwner1})
            eq(Number(tx1), Number(serviceValue))

        })

    })

})
