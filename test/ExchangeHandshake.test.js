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
    const initiatorFeeBack1 = accounts[7]
    const initiatorFeeBack2 = accounts[8]
    const initiatorFeeBack3 = accounts[9]

    const serviceValue = web3.toWei(0.1)
    const fee = web3.toWei(0.0005)
    const feeBack = web3.toWei(0.0005)
    const zeroValue = web3.toWei(0)

    let hs;

    before(async () => {
        hs = await p2p.deployed();
    })

    let tx1, hid1, shakeHid1, deliverHid1, cancelHid1, rejectHid1, withdrawHid1, acceptHid1
    let tx2, hid2, shakeHid2, deliverHid2, cancelHid2, rejectHid2, withdrawHid2, acceptHid2
    let offchain = 1

    describe('at any time', () => {
        it('should making Handshake when coinOwner call initByPayer', async () => {
            tx1 = await hs.initByCoinOwner(exchanger1,initiatorFeeBack1, serviceValue, offchain, { from: coinOwner1, value: serviceValue })
            hid1 = await oc(tx1, "__init", "hid")

            eq(Number(hid1), 0)
            as(!isNaN(hid1))
        })

        it('should init a Handshake when cashOwner call init', async () => {
            tx2 = await hs.init(exchanger2,initiatorFeeBack2, serviceValue, offchain, { from: cashOwner1 })
            hid2 = await oc(tx2, "__init", "hid")
            eq(Number(hid2), 1)
            as(!isNaN(hid2))
        })

        it('should making Handshake when cashOwner call shake to an inited Handshake', async () => {
            tx1 = await hs.shake(hid1, offchain, { from: cashOwner2})
            console.log("----------------"+tx1);
            shakeHid1 = await oc(tx1, "__shake", "hid")
            eq(Number(hid1), Number(shakeHid1))
        })

        it('should making Handshake when coinOwner call shake to an inited Handshake', async () => {
            tx2 = await hs.shake(hid2, offchain, { from: coinOwner2, value: serviceValue })
            shakeHid2 = await oc(tx2, "__shake", "hid")
            eq(Number(hid2), Number(shakeHid2))
        })


        it('should return incremental hid', async () => {
            eq(Number(hid1), 0)
            eq(Number(hid2), 1)
        })
    })


})
