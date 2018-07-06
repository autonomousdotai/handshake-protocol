const Token0 = artifacts.require("Token0")
const Token1 = artifacts.require("Token1")
const Token2 = artifacts.require("Token2")
const TokenRegistry = artifacts.require("TokenRegistry")


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

contract("Token Registry", (accounts) => {

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

    var token0, token1, token2, tokenRegistry;
    var INITIAL_SUPPLY = 100000000;

        
    describe("root deploys contracts", () => {
        it("root deploys token 0", async() => {
            const i = {
                decimals: 0
            }
    
            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
    
            token0 = await Token0.new({ from: root });
            let rootBalance = await token0.balanceOf(root);
                
            eq(o.balance, rootBalance.toNumber())
        });
    
        it("root deploys token 1", async() => {
            const i = {
                decimals: 1
            }
    
            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
    
            token1 = await Token1.new({ from: root });
            let rootBalance = await token1.balanceOf(root);
                
            eq(o.balance, rootBalance.toNumber())
        });
    
        it("root deploys token 2", async() => {
            const i = {
                decimals: 15
            }
    
            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
    
            token2 = await Token2.new({ from: root });
            let rootBalance = await token2.balanceOf(root);
    
            eq(o.balance, rootBalance.toNumber())
        });

        it("root deploys TokenRegistry contract", async() => {
            tokenRegistry = await TokenRegistry.new({ from: root })

            const o = {
                owner: root
            }

            let tokenRegistryOwner = await tokenRegistry.owner({ from: root });

            eq(o.owner, tokenRegistryOwner);
        });
    });

    describe("root adds tokens to TokenRegistry contract", () => {
        it("non-root is not able to add token", async() => {
            const i = {
                address: token0.address,
                symbol: "TKN0",
                name: "Token 0",
                decimals: 0
            }
            await u.assertRevert(tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, { from: maker1 })) 
        });

        it("root adds token 0", async() => {
            const i = {
                address: token0.address,
                symbol: "TKN0",
                name: "Token 0",
                decimals: 0
            }
            var tx = await tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, { from: root }); 

            eq(i.address, await oc(tx, "NewTokenAdded", "tokenAddress"))
            eq(i.symbol, await oc(tx, "NewTokenAdded", "symbol"))
            eq(i.name, await oc(tx, "NewTokenAdded", "name"))
            eq(i.decimals, await oc(tx, "NewTokenAdded", "decimals"))
        });

        it("root adds token 1", async() => {
            const i = {
                address: token1.address,
                symbol: "TKN1",
                name: "Token 1",
                decimals: 15
            }
            var tx = await tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, { from: root }); 

            eq(i.address, await oc(tx, "NewTokenAdded", "tokenAddress"))
            eq(i.symbol, await oc(tx, "NewTokenAdded", "symbol"))
            eq(i.name, await oc(tx, "NewTokenAdded", "name"))
            eq(i.decimals, await oc(tx, "NewTokenAdded", "decimals"))
        });

        it("root adds token 2", async() => {
            const i = {
                address: token2.address,
                symbol: "TKN2",
                name: "Token 2",
                decimals: 15
            }
            var tx = await tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, { from: root }); 

            eq(i.address, await oc(tx, "NewTokenAdded", "tokenAddress"))
            eq(i.symbol, await oc(tx, "NewTokenAdded", "symbol"))
            eq(i.name, await oc(tx, "NewTokenAdded", "name"))
            eq(i.decimals, await oc(tx, "NewTokenAdded", "decimals"))
        });
    });

    describe("root removes token", () => {
        it("root removes token 0", async() => {
            const i = {
                address: token0.address,
                symbol: "TKN0",
                name: "Token 0",
                decimals: 0
            }
            var tx = await tokenRegistry.removeToken(i.address);

            var tx1 = await tokenRegistry.getTokenByAddr(i.address);

            eq('', tx1[0])
            eq('', tx1[1])
            eq(0, tx1[2].toNumber())
            eq(i.address, await oc(tx, "TokenDeleted", "tokenAddress"))
        });
    });

    describe("checks tokens existence", () => {
        it("token 0 is not existed", async() => {
            const i = {
                address: token0.address
            }

            const o = {
                isExisted: false
            }

            var tx = await tokenRegistry.tokenIsExisted(i.address);

            eq(o.isExisted, tx);
        });

        it("token 1 is existed", async() => {
            const i = {
                address: token1.address
            }

            const o = {
                isExisted: true
            }

            var tx = await tokenRegistry.tokenIsExisted(i.address);

            eq(o.isExisted, tx);
        });
    });

    describe("get balance", () => {
        it("get balance of token 0", async() => {
            const i = {
                address: token0.address
            }

            const o = {
                balance: INITIAL_SUPPLY
            }
            
            var tx = await tokenRegistry.getBalanceOf(i.address, root);

            eq(o.balance, tx.toNumber());
        });
    });

})