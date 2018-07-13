var PredictionHandshakeWithToken = artifacts.require('PredictionHandshakeWithToken');
var TokenRegistry = artifacts.require('TokenRegistry');
var Shuriken = artifacts.require('Shuriken');

const l = console.log

const u = require('./util.js')
const eq = assert.equal

const oc = u.oc
const s2b = u.s2b

contract("PredictionHandshakeWithToken", (accounts) => {
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

    const SUPPORT = 1, AGAINST = 2
    const OFFCHAIN = 1

    let hs, tokenRegistry, token;

    before(async () => {
        tokenRegistry = await TokenRegistry.new();
        hs = await PredictionHandshakeWithToken.new(tokenRegistry.address);
        token = await Shuriken.new();
    })

    describe("add shuriken token to TokenRegistry", async () => {
        it("should be able to add", async () => {
            const tx = await tokenRegistry.addNewToken(
                token.address,
                "SHURI",
                "Shuriken",
                18
            );

            const o = {
                address: token.address,
                symbol: "SHURI",
                name: "Shuriken",
                decimals: 18
            }

            eq(o.address, await oc(tx, "NewTokenAdded", "tokenAddress"))
            eq(o.symbol, await oc(tx, "NewTokenAdded", "symbol"))
            eq(o.name, await oc(tx, "NewTokenAdded", "name"))
            eq(o.decimals, await oc(tx, "NewTokenAdded", "decimals"))
        });
    });

    describe('all users approve their tokens to be transferred to contract', async () => {
        it("makers approve token registry contract to transfer their token", async() => {
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: maker1 });
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: maker2 });
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: maker3 });

            const o = {
                value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            }

            let maker1Allowance = await token.allowance(maker1, tokenRegistry.address, { from: maker1 });
            let maker2Allowance = await token.allowance(maker2, tokenRegistry.address, { from: maker2 });
            let maker3Allowance = await token.allowance(maker2, tokenRegistry.address, { from: maker3 });

            eq(o.value, web3.toHex(maker1Allowance));
            eq(o.value, web3.toHex(maker2Allowance));
            eq(o.value, web3.toHex(maker3Allowance));
        });

        it("takers approve token registry contract to transfer their token", async() => {
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: taker1 });
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: taker2 });
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: taker3 });

            const o = {
                value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            }

            let taker1Allowance = await token.allowance(taker1, tokenRegistry.address, { from: taker1 });
            let taker2Allowance = await token.allowance(taker2, tokenRegistry.address, { from: taker2 });
            let taker3Allowance = await token.allowance(taker3, tokenRegistry.address, { from: taker3 });

            eq(o.value, web3.toHex(taker1Allowance));
            eq(o.value, web3.toHex(taker2Allowance));
            eq(o.value, web3.toHex(taker3Allowance));
        });

        it("handshake contract approves token registry contract to transfer token", async() => {
            await hs.approveNewToken([token.address], { from: root });

            const o = {
                value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            }

            let hsAllowance = await token.allowance(hs.address, tokenRegistry.address, { from: root });
            eq(o.value, web3.toHex(hsAllowance));
        });

        it("root approves token registry contract to transfer token", async() => {
            await token.approve(tokenRegistry.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", { from: root });

            const o = {
                value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            }

            let rootAllowance = await token.allowance(root, tokenRegistry.address, { from: root });
            eq(o.value, web3.toHex(rootAllowance));
        });
    });

    describe('mint tokens for all accounts', async() => {
        it('mint tokens for makers', async() => {
            await token.transfer(maker1, 1000*(10**18), { from: root });
            await token.transfer(maker2, 1000*(10**18), { from: root });
            await token.transfer(maker3, 1000*(10**18), { from: root });

            const o = {
                value: 1000 * (10**18)
            }

            let maker1Balance = await token.balanceOf(maker1, { from: root });
            let maker2Balance = await token.balanceOf(maker2, { from: root });
            let maker3Balance = await token.balanceOf(maker3, { from: root });

            eq(o.value, maker1Balance.toNumber())
            eq(o.value, maker2Balance.toNumber())
            eq(o.value, maker3Balance.toNumber())
        });

        it('mint tokens for takers', async() => {
            await token.transfer(taker1, 1000*(10**18), { from: root });
            await token.transfer(taker2, 1000*(10**18), { from: root });
            await token.transfer(taker3, 1000*(10**18), { from: root });

            const o = {
                value: 1000 * (10**18)
            }

            let taker1Balance = await token.balanceOf(taker1, { from: root });
            let taker2Balance = await token.balanceOf(taker2, { from: root });
            let taker3Balance = await token.balanceOf(taker3, { from: root });

            eq(o.value, taker1Balance.toNumber())
            eq(o.value, taker2Balance.toNumber())
            eq(o.value, taker3Balance.toNumber())
        });
    });

    describe('create two prediction markets', () => {
        it('create a prediction market with Shuriken', async () => {
            const i = {
                fee: 2,
                source: s2b("livescore.com"),
                tokenAddress: token.address,
                closingWindow: 10,
                reportWindow: 10,
                disputeWindow: 10,
                creator: creator1
            }
            const o = {
                hid: 0
            }

            const tx = await hs.createMarket(i.fee, i.source, i.tokenAddress, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

            eq(o.hid, await oc(tx, "__createMarket", "hid"))
        });

        it('create second prediction market with Shuriken', async () => {
            const i = {
                fee: 1,
                source: s2b("livescore.com"),
                tokenAddress: token.address,
                closingWindow: 10,
                reportWindow: 10,
                disputeWindow: 10,
                creator: creator2
            }
            const o = {
                hid: 1
            }

            const tx = await hs.createMarket(i.fee, i.source, i.tokenAddress, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

            eq(o.hid, await oc(tx, "__createMarket", "hid"))
        });
    });

    describe('init/make orders', async () => {
        it("should init/make 1st order", async () => {
            const i = {
                hid: 1,
                side: SUPPORT,
                amount: web3.toHex(100*(10**18)),
                odds: 300,
                sender: maker1
            }
            const o = {
                stake: web3.toBigNumber(i.amount)
            }
           
            const tx = await hs.init(i.hid, i.side, i.odds, i.amount, OFFCHAIN, { from: i.sender })

            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())
        })

        it("should init/make 2nd order", async () => {
            const i = {
                hid: 1,
                side: SUPPORT, 
                amount: web3.toHex(100*(10**18)),
                odds: 300,
                sender: maker1 
            }
            const o = {
                stake: web3.toBigNumber(i.amount * 2)
            }

            const tx = await hs.init(i.hid, i.side, i.odds, i.amount, OFFCHAIN, { from: i.sender })
            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())
        })

        it("should init/make 3rd order", async () => {
            const i = {
                hid: 1,
                side: AGAINST, 
                amount: web3.toHex(200*(10**18)),
                odds: 400,
                sender: maker2 
            }
            const o = {
                stake: web3.toBigNumber(i.amount)
            }

            const tx = await hs.init(i.hid, i.side, i.odds, i.amount, OFFCHAIN, { from: i.sender })

            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())
        })

        it("should uninit/cancel 3rd order", async () => {
            const i = {
                hid: 1,
                side: AGAINST, 
                stake: web3.toHex(200*(10**18)),
                odds: 400,
                sender: maker2 
            }
            const o = {
                stake: web3.toBigNumber(0)
            }

            const tx = await hs.uninit(i.hid, i.side, i.stake, i.odds, OFFCHAIN, { from: i.sender })

            eq(o.stake.toNumber(), await oc(tx, "__test__uninit", "stake").toNumber())
        })

        it("should init/make the 4th order", async () => {
            const i = {
                hid: 1,
                side: SUPPORT, 
                amount: web3.toHex(100*(10**18)),
                odds: 300,
                sender: maker1 
            }
            const o = {
                stake: web3.toBigNumber(i.amount * 3)
            }

            const tx = await hs.init(i.hid, i.side, i.odds, i.amount, OFFCHAIN, { from: i.sender })
            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())
        })

    });

    describe('place take orders', () => {
        it("should place 1st take order (exact matched)", async () => {
            const i = {
                hid: 1,
                side: AGAINST, 
                amount: web3.toHex(200*(10**18)),
                takerOdds: 150,
                makerOdds: 300,
                maker: maker1,
                sender: taker1 
            }
            const o = {
                match_taker_stake: web3.toBigNumber(i.amount),
                match_taker_payout: web3.toBigNumber(i.amount * i.takerOdds / 100),
                match_maker_stake: web3.toBigNumber(100*(10**18)),
                match_maker_payout: web3.toBigNumber(300*(10**18)),
                open_maker_stake: web3.toBigNumber(200*(10**18))
            }
            const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, i.amount, OFFCHAIN, { from: i.sender })

            let takerMatchedData = await hs.getMatchedData(i.hid, i.sender, i.side)
            let makerMatchedData = await hs.getMatchedData(i.hid, i.maker, 3 - i.side)

            eq(o.match_taker_stake.toNumber(), await takerMatchedData[0].toNumber());
            eq(o.match_taker_payout.toNumber(), await takerMatchedData[1].toNumber());

            eq(o.match_maker_stake.toNumber(), makerMatchedData[0].toNumber());
            eq(o.match_maker_payout.toNumber(), makerMatchedData[1].toNumber());

            let makerOpenData = await hs.getOpenData(i.hid, i.maker, 3 - i.side)

            eq(o.open_maker_stake.toNumber(), makerOpenData[0].toNumber());

        })

        it("should place 2nd take order (not exact matched)", async () => {
            const i = {
                hid: 1,
                side: AGAINST, 
                amount: web3.toHex(200*(10**18)),
                takerOdds: 120,
                makerOdds: 300,
                maker: maker1,
                sender: taker2 
            }
            const o = {
                match_taker_stake: web3.toBigNumber(i.amount),
                match_taker_payout: web3.toBigNumber(i.amount * i.takerOdds / 100),
                match_maker_stake: web3.toBigNumber(140*(10**18)), // 0.24 - 0.2 + 0.1 = 0.14
                match_maker_payout: web3.toBigNumber(540*(10**18)),
                open_maker_stake: web3.toBigNumber(160*(10**18)),
                open_maker_payout:web3.toBigNumber(240*(10**18))
            }
            const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, i.amount, OFFCHAIN, { from: i.sender })


            let takerMatchedData = await hs.getMatchedData(i.hid, i.sender, i.side)
            let makerMatchedData = await hs.getMatchedData(i.hid, i.maker, 3 - i.side)

            eq(o.match_taker_stake.toNumber(), await takerMatchedData[0].toNumber());
            eq(o.match_taker_payout.toNumber(), await takerMatchedData[1].toNumber());

            eq(o.match_maker_stake.toNumber(), makerMatchedData[0].toNumber());
            eq(o.match_maker_payout.toNumber(), makerMatchedData[1].toNumber());

            let makerOpenData = await hs.getOpenData(i.hid, i.maker, 3 - i.side)

            eq(o.open_maker_stake.toNumber(), makerOpenData[0].toNumber());
        });
    });

    describe('collect payouts', () => {
        it("should not be able to collect payout (no report yet)", async () => {
            const i = {
                hid: 1,
                trader: maker1
            }
            await u.assertRevert(hs.collect(i.hid, OFFCHAIN, { from: i.trader} ))
        });
    });

    describe('report outcome', () => {
        it("should not be able to report outcome (not a reporter)", async () => {
            const i = {
                hid: 1,
                reporter: maker1
            }
            await u.assertRevert(hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter}))
        });

        it("should report outcome", async () => {
            const i = {
                hid: 1,
                reporter: creator2
            }
            u.increaseTime(60)
            const tx = await hs.report(i.hid, SUPPORT, OFFCHAIN, {from: i.reporter})
        });
    });

    describe('collect payouts', () => {
        it("should collect payout (report is now available)", async () => {
            const i = {
                hid: 1,
                trader: maker1
            }

            const o = {
                marketComm: 5.4*(10**18) * .8,
                networkComm: 5.4*(10**18) * .2,
                payout: 694.6*(10**18) //0.54 + 0.16 - 0.0054 
            }

            const tx = await hs.collect(i.hid, OFFCHAIN, { from: i.trader })
            eq(o.networkComm, await oc(tx, "__test__collect", "network").toNumber())
            eq(o.marketComm, await oc(tx, "__test__collect", "market").toNumber())
            eq(o.payout, await oc(tx, "__test__collect", "trader").toNumber())
        });

        it("should not be able to collect payout (already did)", async () => {
            const i = {
                hid: 1,
                trader: maker1
            }
            await u.assertRevert(hs.collect(i.hid, OFFCHAIN, { from: i.trader }))
        });
    });

    describe('user story: refund (no report and expired)', () => {
        it('should create the 3rd prediction market', async () => {
            const i = {
                fee: 1,
                source: s2b("livescore.com"),
                token: token.address,
                closingWindow: 10,
                reportWindow: 10,
                disputeWindow: 10,
                creator: creator2 
            }
            const o = {
                hid: 2
            }

            const tx = await hs.createMarket(i.fee, i.source, i.token, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator})

            eq(o.hid, await oc(tx, "__createMarket", "hid"))
        });

        it("should init/make the 5th order", async () => {
            const i = {
                hid: 2,
                side: SUPPORT, 
                amount: web3.toHex(100*(10**18)),
                odds: 300,
                sender: maker2 
            }
            const o = {
                stake: web3.toBigNumber(i.amount)
            }
            const tx = await hs.init(i.hid, i.side, i.odds, i.amount, OFFCHAIN, { from: i.sender })
            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())
            // eq(o.payout, await oc(tx, "__test__init", "payout"))
        });

        it("should not refund (still within report window)", async () => {
            const i = {
                hid: 2,
                trader: maker2
            }
            await u.assertRevert(hs.refund(i.hid, OFFCHAIN, { from: i.trader }))
        });

        it("should refund", async () => {
            const i = {
                hid: 2,
                trader: maker2
            }
            const o = {
                amt: web3.toBigNumber(100*(10**18))
            }

            u.increaseTime(60)

            const tx = await hs.refund(i.hid, OFFCHAIN, { from: i.trader })
            eq(o.amt.toNumber(), await oc(tx, "__test__refund", "amt").toNumber())
        });
    });

    describe("uninit for trial", async() => {
        it('create a brand new market', async() => {
            const i = {
                fee: 0,
                source: s2b("livescore.com"),
                token: token.address,
                closingWindow: 1000,
                reportWindow: 2000,
                disputeWindow: 3000,
                creator: creator1 
            }
            const o = {
                hid: 3
            }

            const tx = await hs.createMarket(i.fee, i.source, i.token, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator })

            eq(o.hid, await oc(tx, "__createMarket", "hid"))
        });

        it('should be able to init test drive', async() => {
            const i = {
                hid: 3,
                side: SUPPORT,
                odds: 100,
                amount: web3.toHex(1000 * (10**18)),
                maker: maker3,
                creator: creator1
            }

            const o = {
                stake: web3.toBigNumber(i.amount)
            }

            const tx = await hs.initTestDrive(i.hid, i.side, i.odds, i.maker, i.amount, OFFCHAIN, { from: root, value: i.stake })
            
            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())    
        });

        it('should be able to uninit for trial', async() => {
            const i = {
                hid: 3,
                side: SUPPORT,
                odds: 100,
                maker: maker3,
                value: web3.toHex(1000*(10**18))
            }

            const o = {
                amount: web3.toBigNumber(i.value)
            }
          
            const tx = await hs.uninitTestDrive(i.hid, i.side, i.odds, i.maker, i.value, OFFCHAIN, { from: root })

            const total = await hs.total(token.address);
            const trial = await hs.getOpenData(i.hid, i.maker, i.side);

            assert.equal(o.amount.toNumber(), total.toNumber())
            assert.equal(0, trial[0].toNumber())
        });

        it('root is able to withdraw ether from trial total', async() => {
            const total = await hs.total(token.address)
            const rootBalanceBefore = await tokenRegistry.getBalanceOf(token.address, root);

            const tx = await hs.withdrawTrial(token.address, { from: root });
            const rootBalanceAfter = await tokenRegistry.getBalanceOf(token.address, root);

            const expected = (rootBalanceBefore.toNumber() + total.toNumber()) / 10**18

            const realValue = rootBalanceAfter.toNumber() / 10**18

            assert.equal(Math.floor(expected), Math.floor(realValue))

            const totalAfter = await hs.total(token.address)

            assert.equal(0, totalAfter.toNumber())
        });
    });

    describe('dispute function', async() => {
        it('create a market', async() => {
            const i = {
                fee: 0,
                source: s2b("livescore.com"),
                token: token.address,
                closingWindow: 10,
                reportWindow: 10,
                disputeWindow: 10,
                creator: creator1 
            }
            const o = {
                hid: 4
            }

            const tx = await hs.createMarket(i.fee, i.source, i.token, i.closingWindow, i.reportWindow, i.disputeWindow, OFFCHAIN, { from: i.creator })

            assert.equal(o.hid, await oc(tx, "__createMarket", "hid"))
        });

        it("maker1 places an order", async () => {
            const i = {
                hid: 4,
                side: SUPPORT, 
                stake: web3.toHex(200*(10**18)),
                odds: 300,
                sender: maker1 
            }
            const o = {
                stake: web3.toBigNumber(i.stake),
                payout: web3.toBigNumber(i.stake * i.odds / 100)
            }
            const tx = await hs.init(i.hid, i.side, i.odds, i.stake, OFFCHAIN, { from: i.sender })
            eq(o.stake.toNumber(), await oc(tx, "__test__init", "stake").toNumber())
        });

        it("taker1 fills maker1's order", async() => {
            const i = {
                hid: 4,
                side: AGAINST,
                taker: taker1,
                takerOdds: 150,
                value: web3.toHex(400*(10**18)),
                maker: maker1,
                makerOdds: 300
            }
            const o = {
                match_taker_stake: web3.toBigNumber(i.value),
                match_taker_payout: web3.toBigNumber(i.value * i.takerOdds / 100),
                match_maker_stake: web3.toBigNumber(200*(10**18)),
                match_maker_payout: web3.toBigNumber(200*(10**18) * i.makerOdds / 100),
                open_maker_stake: web3.toBigNumber(0)
            }
            const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, i.value, OFFCHAIN, { from: i.taker });
            
            let takerMatchedData = await hs.getMatchedData(i.hid, i.taker, AGAINST)
            let makerMatchedData = await hs.getMatchedData(i.hid, i.maker, SUPPORT)

            eq(o.match_taker_stake.toNumber(), await takerMatchedData[0].toNumber());
            eq(o.match_taker_payout.toNumber(), await takerMatchedData[1].toNumber());

            eq(o.match_maker_stake.toNumber(), makerMatchedData[0].toNumber());
            eq(o.match_maker_payout.toNumber(), makerMatchedData[1].toNumber());

            let makerOpenData = await hs.getOpenData(i.hid, i.maker, 3 - i.side)

            eq(o.open_maker_stake.toNumber(), makerOpenData[0].toNumber());
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

            eq(o.outcome, marketState[8].toNumber())
        });

        it('maker1 disputes the outcome', async () => {
            const i = {
                hid: 4
            }
    
            const o = {
                totalDisputeStake: web3.toBigNumber(200*(10**18))
            }

            const tx = await hs.dispute(i.hid, OFFCHAIN, { from: maker1 });

            const marketState = await hs.markets(4, { from: root });

            eq(o.totalDisputeStake.toNumber(), marketState[11].toNumber())
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

            const tx = await hs.resolve(i.hid, i.outcome, OFFCHAIN, { from: root });
            const marketState = await hs.markets(4, { from: root });
            
            eq(o.outcome, marketState[8].toNumber());
            eq(o.state, marketState[7].toNumber());
        });
    });
});
