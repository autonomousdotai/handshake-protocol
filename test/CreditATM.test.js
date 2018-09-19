const exs = artifacts.require("CreditATM")

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

contract("CreditATM", (accounts) => {
    const root = accounts[0]
    const admin1 = accounts[1]
    const admin2 = accounts[2]
    const StationOwner1 = accounts[6]
    const customer1 = accounts[3]
    const customer2 = accounts[4]
    const customer3 = accounts[5]

    let serviceValue = web3.toWei(5)
    let partialValue = web3.toWei(2)
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
    let percentage = 10
    let tx3, hid3

    describe('at shop owner create the offer', () => {
        it('should deposit coin successful', async () => {
            tx1 = await hs.deposit(offchain,percentage, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__deposit", "hid")

            eq(Number(hid1), 0)
        })
        it('should transfer coin successful by owner', async () => {


            tx1 = await hs.deposit(offchain,percentage, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__deposit", "hid")

            tx1 = await hs.releasePartialFund(customer1,partialValue, offchain, { from: root})
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(partialValue), Number(amount1))

        })

        it('should transfer coin successful by admin', async () => {

            tx1 = await hs.addAdmin(admin1, { from: root})


            tx1 = await hs.deposit(offchain,percentage, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__deposit", "hid")

            tx1 = await hs.releasePartialFund(customer1,partialValue, offchain, { from: admin1})
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(partialValue), Number(amount1))

        })
        it('should not able transfer coin by normal user', async () => {
            tx1 = await hs.addAdmin(admin2, { from: root})

            tx1 = await hs.deposit(offchain,percentage, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__deposit", "hid")

            await u.assertRevert(hs.releasePartialFund(customer1,partialValue, offchain, { from: StationOwner1}))
            tx1 = await hs.releasePartialFund(customer1,partialValue, offchain, { from: admin2})
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(partialValue), Number(amount1))
        })

        it('should not able add admin by normal user', async () => {
            await u.assertRevert(hs.addAdmin(admin2, { from: admin1}))

        })

        it('should not able add duplicate admin', async () => {
            await u.assertRevert(hs.addAdmin(admin2, { from: root}))

        })

        it('should remove admin successful', async () => {

            tx1 = await hs.addAdmin(customer2, { from: root})
            let length1 = await oc(tx1, "__addAdmin", "length")

            tx1 = await hs.rAdmin(admin1, { from: root})
            let length2 = await oc(tx1, "__rAdmin", "length")
            eq(Number(length1), Number(length2)+1)
            await u.assertRevert(hs.releasePartialFund(customer1,partialValue, offchain, { from: admin1}))


        })

        it('should able to get deposit info', async () => {

            tx1 = await hs.getDepositList(0)
            console.log(tx1[0])
            console.log(tx1[1].toNumber())
            console.log(tx1[2].toNumber())
            console.log(serviceValue)

            eq(StationOwner1, tx1[0])
            eq(Number(serviceValue), tx1[1].toNumber())
            eq(Number(percentage), tx1[2].toNumber())



        })
    })
})
