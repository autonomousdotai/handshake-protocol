const Shuriken = artifacts.require("Shuriken")
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
    var INITIAL_SUPPLY = 27000000;
    const OFFCHAIN = 'cryptosign_123';

        
    describe("root deploys contracts", () => {
        it("root deploys token 0", async() => {
            const i = {
                decimals: 18
            }
    
            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
    
            token0 = await Shuriken.new({ from: root });
            let rootBalance = await token0.balanceOf(root);
                
            eq(o.balance, rootBalance.toNumber())
        });
    
        it("root deploys token 1", async() => {
            const i = {
                decimals: 18
            }
    
            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
    
            token1 = await Shuriken.new({ from: root });
            let rootBalance = await token1.balanceOf(root);
                
            eq(o.balance, rootBalance.toNumber())
        });
    
        it("root deploys token 2", async() => {
            const i = {
                decimals: 18
            }
    
            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
    
            token2 = await Shuriken.new({ from: root });
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
        it("non-root add token 0", async() => {
            const i = {
                address: token0.address,
                symbol: "SHURI",
                name: "Shuriken",
                decimals: 18
            }

            const o = {
                tid: 0
            }

            const tx = await tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, OFFCHAIN, { from: maker1 })
            eq(o.tid, await oc(tx, "__addNewToken", "tid")) 
        });

        it("root adds token 0", async() => {
            const i = {
                address: token0.address,
                symbol: "SHURI",
                name: "Shuriken",
                decimals: 18
            }

            const o = {
                tid: 1
            }

            var tx = await tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, OFFCHAIN, { from: root }); 
            eq(o.tid, await oc(tx, "__addNewToken", "tid"))
        });

        it("root adds token 1", async() => {
            const i = {
                address: token1.address,
                symbol: "SHURI",
                name: "Shuriken",
                decimals: 18
            }

            const o = {
                tid: 2
            }

            var tx = await tokenRegistry.addNewToken(i.address, i.symbol, i.name, i.decimals, OFFCHAIN, { from: root }); 
            eq(o.tid, await oc(tx, "__addNewToken", "tid"))
        });

    });

    describe("checks tokens existence", () => {
        it("token 2 is not existed", async() => {
            const i = {
                address: token2.address
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
                address: token0.address,
                decimals: await token0.decimals(),
            }

            const o = {
                balance: INITIAL_SUPPLY * (10**i.decimals)
            }
            
            var tx = await tokenRegistry.getBalanceOf(i.address, root);
            eq(o.balance, tx.toNumber());
        });
    });


    describe("get token info", () => {
        it("get info of token 0", async() => {
            const i = {
                address: token0.address
            }

            const o = {
                symbol: "SHURI",
                name: "Shuriken",
                decimals: 18
            }
            
            var tx = await tokenRegistry.getTokenByAddr(i.address);
            eq(o.symbol, tx[0]);
            eq(o.name, tx[1]);
            eq(o.decimals, tx[2].toNumber());
        });
    });

})