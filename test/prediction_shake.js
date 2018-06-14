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

  const SUPPORT = 1, AGAINST = 2
  const OFFCHAIN = 1

  let hs;

  before(async () => {
    hs = await p2p.deployed();
  })

  describe('place take orders', () => {

    it("should place take order takerPayout > makerPayout", async () => {

      // Created market
      const m = {
        fee: 2,
        source: s2b("livescore.com"),
        closingWindow: 10,
        reportWindow: 10,
        disputeWindow: 10,
        creator: creator1
      }
      await hs.createMarket(m.fee, m.source, m.closingWindow, m.reportWindow, m.disputeWindow, OFFCHAIN, {from: m.creator})

      // Create order
      const order = {
        hid: 0,
        side: SUPPORT,
        stake: web3.toWei(0.1),
        odds: 300,
        sender: maker1
      }
      await hs.init(order.hid, order.side, order.odds, OFFCHAIN, {from: order.sender, value: order.stake})


      const i = {
        hid: 0,
        side: AGAINST,
        stake: web3.toWei(0.4),
        takerOdds: 120,
        makerOdds: 300,
        maker: maker1,
        sender: taker1
      }
      const o = {
        match_taker_stake: web3.toWei(0.2), // 0.3 - 0.1
        match_taker_payout: web3.toWei(0.3),
        match_maker_stake: web3.toWei(0.1),
        match_maker_payout: web3.toWei(0.3),
        open_maker_stake: web3.toWei(0),
        open_maker_payout: web3.toWei(0)
      }

      // Create shake with takerPayout > makerPayout
      const tx = await hs.shake(i.hid, i.side, i.takerOdds, i.maker, i.makerOdds, OFFCHAIN, {
        from: i.sender,
        value: i.stake
      })

      eq(o.match_taker_stake, await oc(tx, "__test__shake__taker__matched", "stake"));
      eq(o.match_taker_payout, await oc(tx, "__test__shake__taker__matched", "payout"));
      eq(o.match_maker_stake, await oc(tx, "__test__shake__maker__matched", "stake"));
      eq(o.match_maker_payout, await oc(tx, "__test__shake__maker__matched", "payout"));
      eq(o.open_maker_stake, await oc(tx, "__test__shake__maker__open", "stake"));
    })

  })
})
