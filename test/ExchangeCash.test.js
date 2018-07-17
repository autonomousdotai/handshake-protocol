const exs = artifacts.require("ExchangeCash")

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
    const StationOwner1 = accounts[1]
    const StationOwner2 = accounts[2]
    const StationOwner3 = accounts[6]
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
    let tx3, hid3

    describe('at shop owner create the offer', () => {
        it('should set exchange fee successful', async () => {

            tx1 = await hs.setFee(fee, { from: root })
            fee1 = await oc(tx1, "__setFee", "fee")
            eq(Number(fee1), fee)
        })
        it('should transfer coin successful', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")
            let blb2= u.balance(customer1)

            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner1})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1)-Number(amount1)*fee/1000)

            let bla2= u.balance(customer1)

            eq(Number(blb2) + Number(partialValue), Number(bla2))

        })

        it('should not able to transfer coin when escrow < partialFund', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            tx2 = await hs.initByStationOwner(offchain, { from: StationOwner2, value: serviceValue })

            hid1 = await oc(tx1, "__initByStationOwner", "hid")
            //the first time
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner1})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //second times
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner1})
            releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //third times
            await u.assertRevert(hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner1}))

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1)*2-2*(Number(amount1)*fee/1000))

        })

        it('should change stage to done when transfer all coin in escrow', async () => {
            tx1 = await hs.setFee(0, { from: root })

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner3, value: serviceValue })

            hid1 = await oc(tx1, "__initByStationOwner", "hid")
            //the first time
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner3})
            let releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            let amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //second times
            tx1 = await hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner3})
            releaseHid1 = await oc(tx1, "__releasePartialFund", "hid")
            amount1 = await oc(tx1, "__releasePartialFund", "amount")

            eq(Number(hid1), Number(releaseHid1))
            eq(Number(partialValue), Number(amount1))

            //third times
            tx1 = await hs.releasePartialFund(hid1, customer1, partialValue2, offchain, offchain2, { from: StationOwner3})

            tx1 = await hs.getBalance(hid1, { from: StationOwner3})
            console.log(Number(tx1))

            eq(Number(tx1), Number(serviceValue)-Number(amount1)*2 - Number(partialValue2))
            eq(Number(tx1), 0)

            tx1 = await hs.getState(hid1)
            eq(3, Number(tx1)) //3:done stage

            await u.assertRevert(hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: StationOwner3}))


        })

        it('should not able to transfer coin by another one', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            tx2 = await hs.initByStationOwner(offchain, { from: StationOwner2, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")
            hid2 = await oc(tx2, "__initByStationOwner", "hid")

            await u.assertRevert(hs.releasePartialFund(hid1,customer1,partialValue, offchain,offchain2, { from: customer1}))
            await u.assertRevert(hs.releasePartialFund(hid2,customer2,partialValue, offchain,offchain2, { from: customer1}))

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1), Number(serviceValue))

            tx2 = await hs.getBalance(hid2, { from: StationOwner1})
            eq(Number(tx2), Number(serviceValue))

        })

        it('should cancel successful', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")
            tx1 = await hs.cancel(hid1,offchain, { from: StationOwner1})
            let cancelHid1 = await oc(tx1, "__cancel", "hid")

            eq(Number(hid1), Number(cancelHid1))

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1), 0)

        })

        it('should not able to cancel by customer', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")
            await u.assertRevert(hs.cancel(hid1,offchain, { from: customer1}))

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1), Number(serviceValue))

        })

        it('should able to add inventory', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")

            tx1 = await hs.addInventory(hid1, offchain, { from: StationOwner1, value: serviceValue })

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1), Number(serviceValue)*2)


            tx1 = await hs.addInventory(hid1, offchain, { from: StationOwner1, value: partialValue })

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1), Number(serviceValue)*2+Number(partialValue))



        })

        it('should able to reset staion owner', async () => {

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")


            tx2 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid2 = await oc(tx2, "__initByStationOwner", "hid")

            tx1 = await hs.resetAllStation(offchain, { from: root})

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1),0)

            tx2 = await hs.getBalance(hid2, { from: StationOwner1})
            eq(Number(tx2),0)

            tx1 = await hs.getState(hid1)
            eq(2, Number(tx1)) //2:canceled stage

            tx2 = await hs.getState(hid2)
            eq(2, Number(tx2)) //2:canceled stage


        })

    })

    describe('at customer create the offer', () => {
        it('should set exchange fee successful', async () => {

            tx1 = await hs.setFee(fee, { from: root })
            fee1 = await oc(tx1, "__setFee", "fee")
            eq(Number(fee1), fee)
        })

        it('should init successful', async () => {

            tx1 = await hs.initByCustomer(StationOwner1, offchain, { from: customer1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

           /* tx1 = await hs.shake(hid1, offchain, { from: StationOwner1})
            let shakeHid1 = await oc(tx1, "__shake", "hid")

            eq(Number(hid1), Number(shakeHid1))*/

        })

        it('should transfer coin successful', async () => {

            tx1 = await hs.initByCustomer(StationOwner1, offchain, { from: customer1, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")
/*
            tx1 = await hs.shake(hid1, offchain, { from: StationOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))*/

            let blb1= u.balance(StationOwner1)

            tx1 = await hs.finish(hid1, offchain, { from: customer1})
            finishHid1 = await oc(tx1, "__finish", "hid")
            eq(Number(hid1), Number(finishHid1))

            let bla1= u.balance(StationOwner1)
            eq(Number(blb1)+ Number(serviceValue)-Number(serviceValue)*fee/1000, Number(bla1))

        })

        it('should not able to transfer coin by Shop Owner', async () => {

            tx1 = await hs.initByCustomer(StationOwner1, offchain, { from: customer2, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            /*tx1 = await hs.shake(hid1, offchain, { from: StationOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))*/

            await u.assertRevert(hs.finish(hid1, offchain, { from: StationOwner1}))

        })

        it('should reject after shook by customer successful', async () => {

            tx1 = await hs.initByCustomer(StationOwner1, offchain, { from: customer2, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

           /* tx1 = await hs.shake(hid1, offchain, { from: StationOwner1})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))*/

            tx1 = await hs.reject(hid1, offchain, { from: customer2})
            rejectHid1 = await oc(tx1, "__reject", "hid")
            eq(Number(hid1), Number(rejectHid1))

            tx1 = await hs.getState(hid1)
            eq(1, Number(tx1)) //1:rejected stage

        })

        it('should reject after shook by shop owner successful', async () => {

            tx1 = await hs.initByCustomer(StationOwner3, offchain, { from: customer2, value: serviceValue })
            hid1 = await oc(tx1, "__initByCustomer", "hid")

            /*tx1 = await hs.shake(hid1, offchain, { from: StationOwner3})
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))
*/
            tx1 = await hs.reject(hid1, offchain, { from: StationOwner3})
            rejectHid1 = await oc(tx1, "__reject", "hid")
            eq(Number(hid1), Number(rejectHid1))

            tx1 = await hs.getState(hid1)
            eq(1, Number(tx1)) //1:rejected stage

        })

        it('should able to reset station owner & customer', async () => {
            let blb1= u.balance(StationOwner1)

            tx1 = await hs.initByStationOwner(offchain, { from: StationOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__initByStationOwner", "hid")


            tx2 = await hs.initByStationOwner(offchain, { from: StationOwner2, value: serviceValue })
            hid2 = await oc(tx2, "__initByStationOwner", "hid")

            tx3 = await hs.initByCustomer(StationOwner3, offchain, { from: customer2, value: serviceValue })
            hid3 = await oc(tx3, "__initByCustomer", "hid")


            tx1 = await hs.resetAllStation(offchain, { from: root})
            let bla1= u.balance(StationOwner1)
            let gasFee = 8605699999997952;//cost when call initByStationOwner function
            console.log(Number(blb1) - Number(bla1));
            eq(Number(blb1),Number(bla1)+gasFee);

            tx1 = await hs.getBalance(hid1, { from: StationOwner1})
            eq(Number(tx1),0)

            tx2 = await hs.getBalance(hid2, { from: StationOwner1})
            eq(Number(tx2),0)

            tx3 = await hs.getBalance(hid3, { from: StationOwner1})
            eq(Number(tx3),0)

            tx1 = await hs.getState(hid1)
            eq(2, Number(tx1)) //2:canceled stage

            tx2 = await hs.getState(hid2)
            eq(2, Number(tx2)) //2:canceled stage

            tx3 = await hs.getState(hid3)
            eq(2, Number(tx3)) //2:canceled stage


        })

    })

})
