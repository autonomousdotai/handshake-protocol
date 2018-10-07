const p2p = artifacts.require("PredictionHandshake")

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

contract("PredictionHandshake", (accounts) => {

        const root = accounts[0]
        const creator1 = accounts[1]
        const creator2 = accounts[2]
        const maker1 = accounts[3]
        const maker2 = accounts[4]
        const maker3 = accounts[5]
        const taker1 = accounts[6]
        const taker2 = accounts[7]
        const taker3 = accounts[8]
        const reporter1 = accounts[9]

        const DRAW = 3, SUPPORT = 1, AGAINST = 2
        const OFFCHAIN = 1

        let hs;

        before(async () => {
                hs = await p2p.deployed();
        })

        describe('create two prediction markets', () => {

                it('should create the 1st prediction market', async () => {
                        const i = {
                                fee: 2,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator1 
                        }
                        const o = {
                                hid: 0
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it('should create the 2nd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 1
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

        })

        describe('init/make orders', () => {

                it("should init/make 1st order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("should init/make 2nd order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake * 2,
                                payout: i.stake * 2 * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("should init/make 3rd order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                odds: 400,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("should uninit/cancel 3rd order", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                odds: 400,
                                sender: maker2 
                        }
                        const o = {
                                stake: 0,
                                payout: 0
                        }
                        const tx = await hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, {from: i.sender})
                        eq(o.stake, await oc(tx, "__test__uninit", "stake"))
                })

                it("should init/make the 4th order", async () => {
                        const i = {
                                hid: 1,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake * 3,
                                payout: i.stake * 3 * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

        })

        describe('place take orders', () => {

                it("should place 1st take order (exact matched)", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker1,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: web3.toWei(0.3),
                                open_maker_stake: web3.toWei(0.2),
                                open_maker_payout: web3.toWei(0.6)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})

                        eq(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"))
                        eq(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"))

                        eq(o.match_maker_stake, await oc(tx, "__test__shake__maker__matched", "stake"))
                        eq(o.match_maker_payout, await oc(tx, "__test__shake__maker__matched", "payout"))

                        eq(o.open_maker_stake, await oc(tx, "__test__shake__maker__open", "stake"))

                })

                it("should place 2nd take order (not exact matched)", async () => {
                        const i = {
                                hid: 1,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 120,
                                makerOdds: 300,
                                maker: maker1,
                                sender: taker2 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.14), // 0.24 - 0.2 + 0.1
                                match_maker_payout: web3.toWei(0.54),
                                open_maker_stake: web3.toWei(0.16),
                                open_maker_payout: web3.toWei(0.24)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})

                        eq(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"))
                        eq(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"))

                        eq(o.match_maker_stake, await oc(tx, "__test__shake__maker__matched", "stake"))
                        eq(o.match_maker_payout, await oc(tx, "__test__shake__maker__matched", "payout"))

                        eq(o.open_maker_stake, await oc(tx, "__test__shake__maker__open", "stake"))

                })
        })

        describe('collect payouts', () => {

                it("should not be able to collect payout (no report yet)", async () => {
                        const i = {
                                hid: 1,
                                trader: maker1
                        }
                        await u.assertRevert(hs.collect(i.hid, OFFCHAIN, {from: i.trader}))
                })
        })


        describe('report outcome', () => {

                it("should not be able to report outcome (not a reporter)", async () => {
                        const i = {
                                hid: 1,
                                reporter: maker1
                        }
                        await u.assertRevert(hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter}))
                })

                it("should report outcome", async () => {
                        const i = {
                                hid: 1,
                                reporter: creator2
                        }

                        u.increaseTime(10)

                        const tx = await hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter})

                })
        })

        describe('collect payouts', () => {

                it("should collect payout (report is now available)", async () => {
                        const i = {
                                hid: 1,
                                trader: maker1
                        }
                        const o = {
                                marketComm: web3.toWei(.0054 * .8),
                                networkComm: web3.toWei(.0054 * .2),
                                payout: web3.toWei(0.6946) //0.54 + 0.16 - 0.0054 
                        }
                        u.increaseTime(20)

                        const tx = await hs.collect(i.hid, OFFCHAIN, {from: i.trader})
                        eq(o.networkComm, await oc(tx, "__test__collect", "network"))
                        eq(o.marketComm, await oc(tx, "__test__collect", "market"))
                        eq(o.payout, await oc(tx, "__test__collect", "trader"))
                })
        })

        describe('user story: refund (no report and expired)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 2
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("should init/make the 5th order", async () => {
                        const i = {
                                hid: 2,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("should not refund (still within report window)", async () => {
                        const i = {
                                hid: 2,
                                trader: maker2
                        }
                        await u.assertRevert(hs.refund(i.hid, OFFCHAIN, {from: i.trader}))
                })

                it("should refund", async () => {
                        const i = {
                                hid: 2,
                                trader: maker2
                        }
                        const o = {
                                amt: web3.toWei(0.1)
                        }

                        u.increaseTime(60)

                        const tx = await hs.refund(i.hid, OFFCHAIN, {from: i.trader})
                        eq(o.amt, await oc(tx, "__test__refund", "amt"))
                })

        })

        describe("uninit for trial", async() => {
                it('create a brand new market', async() => {
                        const i = {
                                fee: 0,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 1000,
                                reportWindow: 2000,
                                disputeWindow: 3000,
                                creator: creator2 
                        }
                        const o = {
                            hid: 3
                        }
        
                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                });

                it('should be able to init test drive', async() => {
                        const i = {
                                hid: 3,
                                side: SUPPORT,
                                odds: 100,
                                stake: web3.toWei(0.01, 'ether'),
                                maker: maker3,
                                creator: root
                        }
        
                        const tx = await hs.initTestDrive(i.hid, i.side, i.odds, i.maker, OFFCHAIN, { from: i.creator, value: i.stake })
                        const trial = await hs.getOpenData(i.hid, i.side, i.maker, i.odds);
        
                        eq(web3.toWei(0.01, 'ether'), trial[0].toNumber())
                        eq(web3.toWei(0.01, 'ether'), await oc(tx, "__test__init", "stake"))    
                });

                it('should be able to uninit for trial', async() => {
                        const i = {
                                hid: 3,
                                side: SUPPORT,
                                odds: 100,
                                maker: maker3,
                                value: web3.toWei(0.01, 'ether')
                        }
                      
                        const tx = await hs.uninitTestDrive(i.hid, i.side, i.odds, i.maker, i.value, OFFCHAIN, { from: root })
        
                        const total = await hs.total()
                        const trial = await hs.getOpenData(i.hid, i.side, i.maker, i.odds);
        
                        assert.equal(web3.toWei(0.01, 'ether'), total)
                        assert.equal(0, trial[0].toNumber())
                });

                it('root is able to withdraw ether from trial total', async() => {
                        const total = await hs.total()
                        const rootBalanceBefore = await web3.eth.getBalance(root)
        
                        const tx = await hs.withdrawTrial({ from: root });
                        const rootBalanceAfter = await web3.eth.getBalance(root)
        
                        const expected = (rootBalanceBefore.toNumber() + total.toNumber()) / 10**18
        
                        const realValue = rootBalanceAfter.toNumber() / 10**18
        
                        assert.equal(Math.floor(expected), Math.floor(realValue))
        
                        const totalAfter = await hs.total()
        
                        assert.equal(0, totalAfter.toNumber())
                });
        });

        describe('dispute function', async() => {
                it('create a market', async() => {
                        const i = {
                                fee: 0,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator1 
                        }
                        const o = {
                            hid: 4
                        }
        
                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
        
                        assert.equal(o.hid, await oc(tx, "__createMarket", "hid"))
                });

                it("maker1 places an order", async () => {
                        const i = {
                                hid: 4,
                                side: SUPPORT, 
                                stake: web3.toWei(2, 'ether'),
                                odds: 300,
                                sender: maker1 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                });

                it("taker1 fills maker1's order", async() => {
                        const i = {
                                hid: 4,
                                side: AGAINST,
                                taker: taker1,
                                takerOdds: 150,
                                value: web3.toWei('4', 'ether'),
                                maker: maker1,
                                makerOdds: 300
                        }
                        const o = {
                                match_taker_stake: i.value,
                                match_taker_payout: i.value * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(2, 'ether'),
                                match_maker_payout: web3.toWei(2, 'ether') * i.makerOdds / 100,
                                open_maker_stake: web3.toWei(0)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, { from: i.taker, value: i.value });
                        
                        assert.equal(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"))
                        assert.equal(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"))
        
                        assert.equal(o.match_maker_stake, await oc(tx, "__test__shake__maker__matched", "stake"))
                        assert.equal(o.match_maker_payout, await oc(tx, "__test__shake__maker__matched", "payout"))
        
                        assert.equal(o.open_maker_stake, await oc(tx, "__test__shake__maker__open", "stake"))
                });

                it('creator reports an outcome on the order', async () => {
                        const i = {
                                hid: 4,
                                creator: creator1,
                                outcome: 2
                        }

                        const o = {
                                outcome: 2
                        }
                
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator });
        
                        var marketState = await hs.markets(4, { from: root });
        
                        assert.equal(o.outcome, marketState[7].toNumber())
                });

                it('maker1 disputes the outcome', async () => {
                        const i = {
                                hid: 4
                        }
                
                        const o = {
                                totalDisputeStake: web3.toWei(2, 'ether')
                        }

                        const tx = await hs.dispute(i.hid, OFFCHAIN, { from: maker1 });
        
                        const marketState = await hs.markets(4, { from: root });
        
                        assert.equal(o.totalDisputeStake, marketState[10].toNumber())
                });

                it('root resolves the dispute', async() => {
                        const i = {
                                hid: 4,
                                outcome: 1
                        }

                        const o = {
                                state: 2,
                                outcome: 1
                        }
        
                        await u.assertRevert(hs.resolve(i.hid, 0, OFFCHAIN, { from: root }));
                        const tx = await hs.resolve(i.hid, i.outcome, OFFCHAIN, { from: root });
                        const marketState = await hs.markets(4, { from: root });
                        
                        assert.equal(o.outcome, marketState[7].toNumber());
                        assert.equal(o.state, marketState[6].toNumber());
                });
        });


        describe('user story: uninit (report window and i am maker)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 5
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 5,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("should uninit (in report window)", async () => {
                        const i = {
                                hid: 5,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2,
                                creator: creator2 
                        }
                        const o = {
                                stake: 0,
                                payout: 0
                        }
                        u.increaseTime(60)
                        const tx = await hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, {from: i.sender})
                        eq(o.stake, await oc(tx, "__test__uninit", "stake"))
                })
        })

        describe('user story: uninit (report window and i am taker)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 6
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 6,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("shake", async () => {
                        const i = {
                                hid: 6,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker2,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: web3.toWei(0.3),
                                open_maker_stake: web3.toWei(0.2),
                                open_maker_payout: web3.toWei(0.6)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})
                })

                it("shouldn't uninit (in report window and i am taker)", async () => {
                        const i = {
                                hid: 6,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                odds: 150,
                                sender: taker1
                        }
                        const o = {
                                stake: 0,
                                payout: 0
                        }
                        u.increaseTime(60)
                        await u.assertRevert(hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, {from: i.sender}))
                })
        })


        describe('user story: refund (> report window and outcome is draw)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 7
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 7,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("shake", async () => {
                        const i = {
                                hid: 7,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker2,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: web3.toWei(0.3),
                                open_maker_stake: web3.toWei(0.2),
                                open_maker_payout: web3.toWei(0.6)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})
                })

                it("report outcome (draw)", async () => {
                        const i = {
                                hid: 7,
                                outcome: DRAW, 
                                creator: creator2
                        }
                        u.increaseTime(10)
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator });
                })

                it("should refund", async () => {
                        const i = {
                                hid: 7,
                                outcome: DRAW,
                                sender: taker1,
                                creator: creator2
                        }
                        const o = {
                                payout: web3.toWei(0.2)
                        }
                        u.increaseTime(20)
                        const tx = await hs.refund(i.hid, OFFCHAIN, {from: i.sender})
                        eq(o.payout, await oc(tx, "__test__refund", "amt"))
                })
        })


        describe('user story: refund (use both free bet and real bet)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator1 
                        }
                        const o = {
                                hid: 8
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 8,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it('should be able to init test drive', async() => {
                        const i = {
                                hid: 8,
                                side: SUPPORT,
                                odds: 100,
                                stake: web3.toWei(0.001, 'ether'),
                                maker: maker2,
                                creator: creator1
                        }
        
                        const tx = await hs.initTestDrive(i.hid, i.side, i.odds, i.maker, OFFCHAIN, { from: root, value: i.stake })
                        const trial = await hs.getOpenData(i.hid, i.side, i.maker, i.odds);
        
                        eq(web3.toWei(0.1 + 0.001, 'ether'), trial[0].toNumber())
                        eq(web3.toWei(0.1 + 0.001, 'ether'), await oc(tx, "__test__init", "stake"))    
                });

                it("shake", async () => {
                        const i = {
                                hid: 8,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker2,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: web3.toWei(0.3),
                                open_maker_stake: web3.toWei(0.2),
                                open_maker_payout: web3.toWei(0.6)
                        }
                        const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})
                })

                it("report outcome (draw)", async () => {
                        const i = {
                                hid: 8,
                                outcome: DRAW, 
                                creator: creator1
                        }
                        u.increaseTime(10)
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator });
                })

                it("should refund", async () => {
                        const i = {
                                hid: 8,
                                sender: maker2,
                                creator: creator1
                        }
                        const o = {
                                payout: web3.toWei(0.1)
                        }
                        u.increaseTime(20)
                        const tx = await hs.refund(i.hid, OFFCHAIN, {from: i.sender})
                        eq(o.payout, await oc(tx, "__test__refund", "amt").toNumber())
                })
        })

        describe('user story: dispute flows (support wins)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 30,
                                disputeWindow: 50,
                                creator: creator2 
                        }
                        const o = {
                                hid: 9
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 9,
                                side: SUPPORT, 
                                stake1: web3.toWei(0.1),
                                stake2: web3.toWei(0.2),
                                stake3: web3.toWei(0.3),
                                odds1: 300,
                                odds2: 350,
                                odds3: 500,
                                sender1: maker2,
                                sender2: maker1,
                                sender3: maker3
                        }
                        const o = {
                                stake1: i.stake1,
                                payout1: i.stake1 * i.odds1 / 100,

                                stake2: i.stake2,
                                payout2: i.stake2 * i.odds2 / 100,

                                stake3: i.stake3,
                                payout3: i.stake3 * i.odds3 / 100
                        }
                        let tx = await hs.init(i.hid, i.side, i.odds1, OFFCHAIN, {from: i.sender1, value: i.stake1})
                        eq(o.stake1, await oc(tx, "__test__init", "stake"))

                        tx = await hs.init(i.hid, i.side, i.odds2, OFFCHAIN, {from: i.sender2, value: i.stake2})
                        eq(o.stake2, await oc(tx, "__test__init", "stake"))

                        tx = await hs.init(i.hid, i.side, i.odds3, OFFCHAIN, {from: i.sender3, value: i.stake3})
                        eq(o.stake3, await oc(tx, "__test__init", "stake"))
                })

                it("shake", async () => {
                        const i = {
                                hid: 9,
                                side: AGAINST, 

                                stake1: web3.toWei(0.1),
                                takerOdds1: 150,
                                makerOdds1: 300,
                                maker1: maker2,
                                sender1: taker1,

                                stake2: web3.toWei(0.5),
                                takerOdds2: 120,
                                makerOdds2: 500,
                                maker2: maker3,
                                sender2: taker3
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                                match_maker_stake: web3.toWei(0.1),
                                match_maker_payout: web3.toWei(0.3),
                                open_maker_stake: web3.toWei(0.2),
                                open_maker_payout: web3.toWei(0.6)
                        }

                        let tx = await hs.shake(i.hid, i.side, i.takerOdds1, i.maker1, i.makerOdds1, OFFCHAIN, {from: i.sender1, value: i.stake1})
                        tx = await hs.shake(i.hid, i.side, i.takerOdds2, i.maker2, i.makerOdds2, OFFCHAIN, {from: i.sender2, value: i.stake2})
                })

                it("report outcome (support)", async () => {
                        const i = {
                                hid: 9,
                                outcome: SUPPORT, 
                                creator: creator2
                        }
                        u.increaseTime(10)
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator })
                })

                it("taker dispute", async () => {
                        const i = {
                                hid: 9,
                                maker: maker1,
                                taker1: taker1,
                                taker2: taker3,
                                creator: creator2
                        }
                        const o = {
                                hid: 9,
                                state_taker_1: 2,
                                state_taker_3: 3
                        }
                        u.increaseTime(20)
                        await u.assertRevert(hs.dispute(i.hid, OFFCHAIN, {from: i.maker}))
                        let tx = await hs.dispute(i.hid, OFFCHAIN, {from: i.taker1})
                        eq(o.hid, await oc(tx, "__dispute", "hid"))
                        eq(o.state_taker_1, await oc(tx, "__dispute", "state"))

                        tx = await hs.dispute(i.hid, OFFCHAIN, {from: i.taker2})
                        eq(o.hid, await oc(tx, "__dispute", "hid"))
                        eq(o.state_taker_3, await oc(tx, "__dispute", "state"))
                })
        })

        describe('user story: dispute flows (draw)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 30,
                                disputeWindow: 50,
                                creator: creator2 
                        }
                        const o = {
                                hid: 10
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 10,
                                side: SUPPORT, 
                                stake1: web3.toWei(0.1),
                                stake2: web3.toWei(0.2),
                                stake3: web3.toWei(0.3),
                                odds1: 300,
                                odds2: 350,
                                odds3: 500,
                                sender1: maker2,
                                sender2: maker1,
                                sender3: maker3
                        }
                        const o = {
                                stake1: i.stake1,
                                payout1: i.stake1 * i.odds1 / 100,

                                stake2: i.stake2,
                                payout2: i.stake2 * i.odds2 / 100,

                                stake3: i.stake3,
                                payout3: i.stake3 * i.odds3 / 100
                        }
                        let tx = await hs.init(i.hid, i.side, i.odds1, OFFCHAIN, {from: i.sender1, value: i.stake1})
                        eq(o.stake1, await oc(tx, "__test__init", "stake"))

                        tx = await hs.init(i.hid, i.side, i.odds2, OFFCHAIN, {from: i.sender2, value: i.stake2})
                        eq(o.stake2, await oc(tx, "__test__init", "stake"))

                        tx = await hs.init(i.hid, i.side, i.odds3, OFFCHAIN, {from: i.sender3, value: i.stake3})
                        eq(o.stake3, await oc(tx, "__test__init", "stake"))
                })

                it("shake", async () => {
                        const i = {
                                hid: 10,
                                side: AGAINST, 

                                // maker 1
                                makerOdds1: 300,
                                maker1: maker2,

                                // taker 1
                                stake1: web3.toWei(0.1),
                                takerOdds1: 150,
                                sender1: taker1,

                                // maker 2
                                makerOdds2: 500,
                                maker2: maker3,

                                // taker 2
                                stake2: web3.toWei(0.5),
                                takerOdds2: 120,
                                sender2: taker3
                        }
                        const o = {
                                match_taker_stake1: web3.toWei(0.1),
                                match_taker_payout1: web3.toWei(0.15),
                                match_maker_stake1: web3.toWei(0.05),
                                match_maker_payout1: web3.toWei(0.15),
                                open_maker_stake1: web3.toWei(0.05)
                        }

                        let tx = await hs.shake(i.hid, i.side, i.takerOdds1, i.maker1, i.makerOdds1, OFFCHAIN, {from: i.sender1, value: i.stake1})
                        eq(o.match_taker_stake1, await oc(tx, "__test__shake__taker__matched", "stake"))
                        eq(o.match_taker_payout1, await oc(tx, "__test__shake__taker__matched", "payout"))

                        eq(o.match_maker_stake1, await oc(tx, "__test__shake__maker__matched", "stake"))
                        eq(o.match_maker_payout1, await oc(tx, "__test__shake__maker__matched", "payout"))

                        eq(o.open_maker_stake1, await oc(tx, "__test__shake__maker__open", "stake"))

                        tx = await hs.shake(i.hid, i.side, i.takerOdds2, i.maker2, i.makerOdds2, OFFCHAIN, {from: i.sender2, value: i.stake2})
                })

                it("report outcome (draw)", async () => {
                        const i = {
                                hid: 10,
                                outcome: DRAW, 
                                creator: creator2
                        }
                        u.increaseTime(10)
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator })
                })

                it("dispute", async () => {
                        const i = {
                                hid: 10,
                                maker1: maker1,
                                maker2: maker2,
                                maker3: maker3,
                                taker1: taker1,
                                taker2: taker3,
                                creator: creator2
                        }
                        const o = {
                                hid: 10,
                                state: 2,
                                dispute_state: 3,
                                outcome: DRAW
                        }
                        u.increaseTime(40)
                        let tx = await hs.dispute(i.hid, OFFCHAIN, {from: i.taker1})
                        eq(o.hid, await oc(tx, "__dispute", "hid"))
                        eq(o.state, await oc(tx, "__dispute", "state"))
                        eq(o.outcome, await oc(tx, "__dispute", "outcome"))

                        await u.assertRevert(hs.dispute(i.hid, OFFCHAIN, {from: i.maker1}))

                        tx = await hs.dispute(i.hid, OFFCHAIN, {from: i.maker2})
                        eq(o.hid, await oc(tx, "__dispute", "hid"))
                        eq(o.state, await oc(tx, "__dispute", "state"))
                        eq(o.outcome, await oc(tx, "__dispute", "outcome"))

                        tx = await hs.dispute(i.hid, OFFCHAIN, {from: i.taker2})
                        eq(o.hid, await oc(tx, "__dispute", "hid"))
                        eq(o.dispute_state, await oc(tx, "__dispute", "state"))
                        eq(o.outcome, await oc(tx, "__dispute", "outcome"))
                })
        })

        describe('user story: uninit (maker: play both real bet and free bet)', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator1 
                        }
                        const o = {
                                hid: 11
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init real bet", async () => {
                        const i = {
                                hid: 11,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })


                it('should be able to init test drive', async() => {
                        const i = {
                                hid: 11,
                                side: SUPPORT,
                                odds: 300,
                                stake: web3.toWei(0.01),
                                maker: maker2,
                                creator: root
                        }
        
                        const tx = await hs.initTestDrive(i.hid, i.side, i.odds, i.maker, OFFCHAIN, { from: i.creator, value: i.stake })
                        const trial = await hs.getOpenData(i.hid, i.side, i.maker, i.odds);
        
                        eq(web3.toWei(0.11, 'ether'), trial[0].toNumber())
                        eq(web3.toWei(0.11, 'ether'), await oc(tx, "__test__init", "stake"))    
                });


                it("cannot uninit free bet + real bet", async () => {
                        const i = {
                                hid: 11,
                                side: SUPPORT, 
                                stake: web3.toWei(0.11),
                                odds: 300,
                                sender: maker2
                        }
                        
                        await u.assertRevert(hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, {from: i.sender}))
                })

                it("uninit real bet", async () => {
                        const i = {
                                hid: 11,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2
                        }
                        
                        const tx = await hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, {from: i.sender})
                        const trial = await hs.getOpenData(i.hid, i.side, i.sender, i.odds);
        
                        eq(web3.toWei(0.01, 'ether'), trial[0].toNumber())
                })
        })


        describe('view match data', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 12
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 12,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker3 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        let tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))

                        tx = await hs.getOpenData(i.hid, i.side, i.sender, i.odds, {from: root})
                        eq(o.stake, tx[0].toNumber())
                        eq(0, tx[1].toNumber())
                })

                it("shake", async () => {
                        const i = {
                                hid: 12,
                                side: AGAINST, 
                                stake: web3.toWei(0.2),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker3,
                                sender: taker1 
                        }

                        const o = {
                                taker_stake: web3.toWei(0.2),
                                taker_payout: web3.toWei(0.3)
                        }

                        let tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: i.sender, value: i.stake})

                        tx = await hs.getMatchedData(i.hid, i.side, i.sender, i.takerOdds, {from: root})
                        eq(o.taker_stake, tx[0].toNumber())
                        eq(o.taker_payout, tx[1].toNumber())
                })
        })

        describe('user story: use free bet to play and collect money', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2 
                        }
                        const o = {
                                hid: 13
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 13,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("shake test drive", async () => {
                        const i = {
                                hid: 13,
                                side: AGAINST, 
                                stake: web3.toWei(0.01),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker2,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                        }
                        const tx = await hs.shakeTestDrive(i.hid, i.side, i.sender, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: root, value: i.stake})

                        eq(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"))
                        eq(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"))
                })

                it("report outcome (against)", async () => {
                        const i = {
                                hid: 13,
                                outcome: AGAINST, 
                                creator: creator2
                        }
                        u.increaseTime(10)
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator })
                })


                it("collect test drive", async () => {
                        const i = {
                                hid: 13,
                                winner: taker1, 
                                sender: root
                        }
                        u.increaseTime(20)
                        await hs.collectTestDrive(i.hid, i.winner, OFFCHAIN, { from: i.sender })
                })
        })

        describe('user story: use shuriken to create market', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 10,
                                disputeWindow: 10,
                                creator: creator2
                        }
                        const o = {
                                hid: 14,
                                creator: creator2
                        }

                        await u.assertRevert(hs.createMarketForShurikenUser(i.creator, i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator}))
                        const tx = await hs.createMarketForShurikenUser(i.creator, i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: root})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))

                        const market = await hs.markets(14, { from: root });
                        eq(market[0], o.creator);
                })
        })


        describe('user story: user plays free bet be able to dispute outcome', () => {

                it('should create the 3rd prediction market', async () => {
                        const i = {
                                fee: 1,
                                source: s2b("livescore.com"),
                                isGrantedPermission: false,
                                closingWindow: 10,
                                reportWindow: 30,
                                disputeWindow: 50,
                                creator: creator2 
                        }
                        const o = {
                                hid: 15
                        }

                        const tx = await hs.createMarket(i.fee, i.source, i.isGrantedPermission, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})
                        eq(o.hid, await oc(tx, "__createMarket", "hid"))
                })

                it("init", async () => {
                        const i = {
                                hid: 15,
                                side: SUPPORT, 
                                stake: web3.toWei(0.1),
                                odds: 300,
                                sender: maker2 
                        }
                        const o = {
                                stake: i.stake,
                                payout: i.stake * i.odds / 100
                        }
                        const tx = await hs.init(i.hid, i.side, i.odds, OFFCHAIN, {from: i.sender, value: i.stake})
                        eq(o.stake, await oc(tx, "__test__init", "stake"))
                })

                it("shake test drive", async () => {
                        const i = {
                                hid: 15,
                                side: AGAINST, 
                                stake: web3.toWei(0.01),
                                takerOdds: 150,
                                makerOdds: 300,
                                maker: maker2,
                                sender: taker1 
                        }
                        const o = {
                                match_taker_stake: i.stake,
                                match_taker_payout: i.stake * i.takerOdds / 100,
                        }
                        const tx = await hs.shakeTestDrive(i.hid, i.side, i.sender, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {from: root, value: i.stake})

                        eq(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"))
                        eq(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"))
                })

                it("report outcome (support)", async () => {
                        const i = {
                                hid: 15,
                                outcome: SUPPORT, 
                                creator: creator2
                        }
                        u.increaseTime(10)
                        await hs.report(i.hid, i.outcome, OFFCHAIN, { from: i.creator })
                })


                it("dispute", async () => {
                        const i = {
                                hid: 15,
                                maker: maker2,
                                taker: taker1
                        }
                        const o = {
                                hid: 15,
                                state: 2,
                                dispute_state: 3,
                                outcome: SUPPORT
                        }
                        u.increaseTime(40)
                        let tx = await hs.disputeTestDrive(i.hid, i.taker, OFFCHAIN, {from: root})
                        eq(o.hid, await oc(tx, "__dispute", "hid"))
                        eq(o.dispute_state, await oc(tx, "__dispute", "state").toNumber())
                        eq(o.outcome, await oc(tx, "__dispute", "outcome").toNumber())

                        await u.assertRevert(hs.dispute(i.hid, OFFCHAIN, {from: i.maker}))
                })

        })
})
