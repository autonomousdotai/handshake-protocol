const p2p = artifacts.require("BasicHandshake")

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

contract("BasicHandshake", (accounts) => {
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

    let tx1, hid1
    let tx2, hid2
    let offchain = 1

    describe('at any time', () => {
        it('should be able to initiate handshake from first entity', async () => {
            tx1 = await hs.init(owner2, offchain, { from: owner1 })
            hid1 = await oc(tx1, "__init", "hid")
            as(!isNaN(hid1))
        })

        it("should return incremental hid", async () => {
            tx1 = await hs.init(owner3, offchain, { from: owner2 })
            hid1 = await oc(tx1, "__init", "hid")
            tx2 = await hs.init(owner3, offchain, { from: owner1 })
            hid2 = await oc(tx2, "__init", "hid")
            eq(Number(hid1), Number(hid2)-1)
        })
    })

    describe('when inited', () => {
        it('should be able to make handshake from second entity', async () => {
            tx1 = await hs.init(owner2, offchain, { from: owner1 })
            hid1 = await oc(tx1, "__init", "hid")
            tx2 = await hs.shake(hid1, offchain, { from: owner2 })
            hid2 = await oc(tx2, "__shake", "hid")
            eq(Number(hid1), Number(hid2))
        })

        it("should fail to shake if acceptor does not match", async () => {
            tx1 = await hs.init(owner3, offchain, { from: owner2 })
            hid1 = await oc(tx1, "__init", "hid")
            u.assertRevert(hs.shake(hid1, offchain, { from: owner1 } ))
        })

        it('should update acceptor if not set when init', async () => {
            tx1 = await hs.init('0x0', offchain, { from: owner1 })
            hid1 = await oc(tx1, "__init", "hid")
            eq((await hs.handshakes(hid1))[1], 0)

            tx2 = await hs.shake(hid1, offchain, { from: owner2 })
            await oc(tx2, "__shake", "hid")
            eq((await hs.handshakes(hid1))[1], owner2)
        })
    })
})
