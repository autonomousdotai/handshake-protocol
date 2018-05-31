const p2p = artifacts.require("Reputation")

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

contract("Reputation", (accounts) => {

        const root = accounts[0]
        const user1 = accounts[1]
        const user2 = accounts[2]

        let hs;

        before(async () => {
                hs = await p2p.deployed();
        })

        describe('reputation', () => {
                it('should have score = rating for the first rating', async () => {
                        const i = {
                                user: user1,
                                reviewer: user2,
                                rating: 50
                        }
                        const o = {
                                score: 50
                        }
                        const tx = await hs.add(i.user, i.rating, { from: i.reviewer})
                        eq(o.score, await oc(tx, "__add", "score"))
                })
                it('should have score = average of the first two', async () => {
                        const i = {
                                user: user1,
                                reviewer: user2,
                                rating: 40 
                        }
                        const o = {
                                score: 45
                        }
                        const tx = await hs.add(i.user, i.rating, { from: i.reviewer})
                        eq(o.score, await oc(tx, "__add", "score"))
                })
                it('should have score = average of the first three', async () => {
                        const i = {
                                user: user1,
                                reviewer: user2,
                                rating: 40 
                        }
                        const o = {
                                score: 43
                        }
                        const tx = await hs.add(i.user, i.rating, { from: i.reviewer})
                        eq(o.score, await oc(tx, "__add", "score"))
                })
        })

})
