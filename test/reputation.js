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
        const reviewer1 = accounts[2]

        let hs;

        before(async () => {
                hs = await p2p.deployed();
        })

        describe('add reviewer to approved list', () => {
                it('should add reviewer to approved list', async () => {
                        const i = {
                                reviewer: reviewer1,
                        }
                        const o = {
                                approved: true,
                        }
                        const tx = await hs.approve(i.reviewer, { from: root})
                        eq(o.approved, await hs.approved.call(i.reviewer))
                })
        })

        describe('reputation', () => {
                it('should have rating = rating for the first rating', async () => {
                        const i = {
                                user: user1,
                                reviewer: reviewer1,
                                rating: 50
                        }
                        const o = {
                                rating: 50
                        }
                        const tx = await hs.rate(i.user, i.rating, { from: i.reviewer})
                        eq(o.rating, await hs.rating.call(i.user))
                })
                it('should have rating = average of the first two', async () => {
                        const i = {
                                user: user1,
                                reviewer: reviewer1,
                                rating: 40 
                        }
                        const o = {
                                rating: 45
                        }
                        const tx = await hs.rate(i.user, i.rating, { from: i.reviewer})
                        eq(o.rating, await hs.rating.call(i.user))
                })
                it('should have rating = average of the first three', async () => {
                        const i = {
                                user: user1,
                                reviewer: reviewer1,
                                rating: 40 
                        }
                        const o = {
                                rating: 43
                        }
                        const tx = await hs.rate(i.user, i.rating, { from: i.reviewer})
                        eq(o.rating, await hs.rating.call(i.user))
                })
        })

})
