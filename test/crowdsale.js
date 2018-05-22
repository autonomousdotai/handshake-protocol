var CrowdsaleHandshake = artifacts.require('CrowdsaleHandshake');

var u = require('./util.js');
var eq = assert.equal;
var above = assert.isAbove;
var below = assert.isBelow;

contract('CrowdsaleHandshake', function (acc) {
    let c, tx, seller, hid, offchain = 'abc';
    let e = web3.toWei(1, 'ether')

    before(async function () {
        c = await CrowdsaleHandshake.deployed();
        seller = acc[9];
    });

    describe('Shake and unshake', function () {
        it('should shake successfully', async function () {
            let goal = 4 * e, saletime = 600, deadline = 1200;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });

            hid = await u.oc(tx, '__init', 'hid');
            tx = await c.shake(hid, offchain, { from: acc[1], value: e });

            eq(await u.oc(tx, '__shake', 'state'), 0);  // inited
        });

        it('should shake successfully for 2nd user', async function () {
            tx = await c.shake(hid, offchain, { from: acc[2], value: e });
            eq(await u.oc(tx, '__shake', 'state'), 0);  // inited
        });

        it('should unshake successfully for 1st user', async function () {
            let b = u.eBalance(acc[1])
            tx = await c.unshake(hid, offchain, { from: acc[1] });
            eq(await u.oc(tx, '__unshake', 'state'), 0);  // inited
            above(u.eBalance(acc[1]), b + 0.95);
        });

        it('should shake successfully and change state', async function () {
            tx = await c.shake(hid, offchain, { from: acc[2], value: 2 * e });
            eq(await u.oc(tx, '__shake', 'state'), 0);  // inited

            tx = await c.shake(hid, offchain, { from: acc[3], value: e });
            eq(await u.oc(tx, '__shake', 'state'), 1);  // shaked
        });

        it('should be able to unshake before saletime ends', async function () {
            let b = u.eBalance(acc[2])
            tx = await c.unshake(hid, offchain, { from: acc[2] });
            eq(await u.oc(tx, '__unshake', 'state'), 0);  // inited
            above(u.eBalance(acc[2]), b + 1.95);
        });
    });

    describe('Goal not reached', function () {
        it('should shake successfully', async function () {
            let goal = 3 * e, saletime = 600, deadline = 1200;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });

            hid = await u.oc(tx, '__init', 'hid');
            tx = await c.shake(hid, offchain, { from: acc[1], value: e });

            eq(await u.oc(tx, '__shake', 'state'), 0);  // inited
        });

        it('should not refund before saletime', async function () {
            let b = u.eBalance(acc[1])
            tx = await c.refund(hid, offchain, { from: acc[1] });
            below(u.eBalance(acc[1]), b);
        });

        it('should fail to shake after saletime', async function () {
            let afterSaletime = 700;
            u.increaseTime(afterSaletime);
            u.assertRevert(c.shake(hid, offchain, { from: acc[2], value: e }));
        });

        it('should cancel and refund to first shaker', async function () {
            let b = u.eBalance(acc[1])
            tx = await c.refund(hid, offchain, { from: acc[1] });
            eq(await u.oc(tx, '__refund', 'state'), 2);  // cancelled
            above(u.eBalance(acc[1]), b + 0.9);
        });
    });

    describe('Fund distributed linearly', function () {
        it('should shake successfully', async function () {
            let goal = 2 * e, saletime = 600, deadline = 1200;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });
            hid = await u.oc(tx, '__init', 'hid');

            tx = await c.shake(hid, offchain, { from: acc[1], value: e });
            eq(await u.oc(tx, '__shake', 'state'), 0);  // inited

            tx = await c.shake(hid, offchain, { from: acc[2], value: e });
            eq(await u.oc(tx, '__shake', 'state'), 1);  // shaked
        });

        it('should fail to withdraw before saletime', async function () {
            u.assertRevert(c.withdraw(hid, offchain, { from: seller }));
        });

        it('should fail to unshake after goal reached', async function () {
            let afterSaletime = 600;
            u.increaseTime(afterSaletime);
            u.assertRevert(c.unshake(hid, offchain, { from: acc[1] }));
        });

        it('should get half the fund after half the time', async function () {
            let b = u.eBalance(seller);
            let tillHalfTime = 300;
            u.increaseTime(tillHalfTime);
            tx = await c.withdraw(hid, offchain, { from: seller });
            eq(await u.oc(tx, '__withdraw', 'hid').toNumber(), hid.toNumber());
            above(u.eBalance(seller), b + 1.25); // 30% upfront and half of the rest
            below(u.eBalance(seller), b + 1.35);
            eq(await c.additionalPettyCash(hid), 0);
        });

        it('should another 25% of the fund', async function () {
            let b = u.eBalance(seller);
            let tillNext = 150;
            u.increaseTime(tillNext);
            tx = await c.withdraw(hid, offchain, { from: seller });
            above(u.eBalance(seller), b + 0.3);
            below(u.eBalance(seller), b + 0.4);
        });

        it('should get the rest after deadline', async function () {
            let b = u.eBalance(seller);
            let afterDeadline = 800;
            u.increaseTime(afterDeadline);
            tx = await c.withdraw(hid, offchain, { from: seller });
            above(u.eBalance(seller), b + 0.3);
            below(u.eBalance(seller), b + 0.4);
        });

        it('should get zero afterward', async function () {
            let b = u.eBalance(seller);
            let afterDeadline = 800;
            u.increaseTime(afterDeadline);
            tx = await c.withdraw(hid, offchain, { from: seller });
            below(u.eBalance(seller), b);
        });
    });

    describe('Refund appropriate amount', function () {
        it('should fund and withdraw after saletime', async function () {
            let goal = 10 * e, saletime = 600, deadline = 1600;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });
            let time = u.latestTime();
            hid = await u.oc(tx, '__init', 'hid');

            tx = await c.shake(hid, offchain, { from: acc[1], value: 2 * e });
            tx = await c.shake(hid, offchain, { from: acc[2], value: 3 * e });
            tx = await c.shake(hid, offchain, { from: acc[3], value: 5 * e });
            eq(await u.oc(tx, '__shake', 'state'), 1);  // shaked

            let tillWithdraw = time + 1000;
            u.increaseTimeTo(tillWithdraw);
            tx = await c.withdraw(hid, offchain, { from: seller });
        });

        it('should refund nothing before voting done', async function () {
            let b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            below(u.eBalance(acc[1]), b);
        });

        it('should change state to cancelled', async function () {
            tx = await c.cancel(hid, offchain, { from: acc[1] });
            eq(await u.oc(tx, '__cancel', 'state'), 1);  // shaked

            u.assertRevert(c.cancel(hid, offchain, { from: acc[1] }));
            u.assertRevert(c.cancel(hid, offchain, { from: acc[4] }));

            tx = await c.cancel(hid, offchain, { from: acc[3] });
            eq(await u.oc(tx, '__cancel', 'state'), 2);  // cancelled
        });

        it('should refund what is left', async function () {
            let b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            let x = u.eBalance(acc[1]);
            above(x, b + 0.8); // 0.84 +- gas
            below(x, b + 0.85);

            b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            below(u.eBalance(acc[1]), b);

            b = u.eBalance(acc[2]);
            tx = await c.refund(hid, offchain, { from: acc[2] });
            x = u.eBalance(acc[2]);
            above(x, b + 1.25); // 1.26 +- gas
            below(x, b + 1.5);

            b = u.eBalance(acc[3]);
            tx = await c.refund(hid, offchain, { from: acc[3] });
            x = u.eBalance(acc[3]);
            above(x, b + 2.0); // 2.1 +- gas
            below(x, b + 2.2);
        });
    });

    describe('Vote for cancellation', function () {
        it('should shake with many users', async function () {
            let goal = 1000, saletime = 600, deadline = 1200;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });

            hid = await u.oc(tx, '__init', 'hid');
            tx = await c.shake(hid, offchain, { from: acc[1], value: 200 });
            tx = await c.shake(hid, offchain, { from: acc[2], value: 200 });
            tx = await c.shake(hid, offchain, { from: acc[3], value: 200 });
            tx = await c.shake(hid, offchain, { from: acc[4], value: 200 });
            tx = await c.shake(hid, offchain, { from: acc[5], value: 200 });
            tx = await c.shake(hid, offchain, { from: acc[6], value: 200 });
            tx = await c.shake(hid, offchain, { from: acc[7], value: 200 });

            eq(await u.oc(tx, '__shake', 'state'), 1);  // shaked
        });

        it('should fail to cancel before saletime', async function () {
            u.assertRevert(c.cancel(hid, offchain, { from: acc[1] }));
            u.assertRevert(c.cancel(hid, offchain, { from: acc[2] }));
        });

        it('should unshake 2 users but not changing state', async function () {
            tx = await c.unshake(hid, offchain, { from: acc[2] });
            tx = await c.unshake(hid, offchain, { from: acc[5] });
            eq(await u.oc(tx, '__unshake', 'state'), 1);  // shaked
        });

        it('should accept cancellations but not changing state', async function () {
            let afterSaletime = 800;
            u.increaseTime(afterSaletime);

            tx = await c.cancel(hid, offchain, { from: acc[1] });
            eq(await u.oc(tx, '__cancel', 'state'), 1);  // shaked

            tx = await c.cancel(hid, offchain, { from: acc[3] });
            eq(await u.oc(tx, '__cancel', 'state'), 1);  // shaked
        });

        it('should fail to cancel 2nd time', async function () {
            u.assertRevert(c.cancel(hid, offchain, { from: acc[1] }));
        });

        it('should not allow unshaked users to cancel', async function () {
            u.assertRevert(c.cancel(hid, offchain, { from: acc[2] }));
            u.assertRevert(c.cancel(hid, offchain, { from: acc[8] }));
        });

        it('should receive one more cancel and change state', async function () {
            tx = await c.cancel(hid, offchain, { from: acc[7] });
            eq(await u.oc(tx, '__cancel', 'state'), 2);  // cancelled
        });
    });

    describe('Creator stops crowdsale', function () {
        it('should init a crowdsale and partially fund it', async function () {
            let goal = 10 * e, saletime = 600, deadline = 1600;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });
            let time = u.latestTime();
            hid = await u.oc(tx, '__init', 'hid');

            tx = await c.shake(hid, offchain, { from: acc[1], value: 2 * e });
            tx = await c.shake(hid, offchain, { from: acc[2], value: 3 * e });
            eq(await u.oc(tx, '__shake', 'state'), 0); // inited

            let timePassed = time + 400;
            u.increaseTimeTo(timePassed);
        });

        it('should stop the crowdsale', async function () {
            tx = await c.stop(hid, offchain, { from: seller });
            eq(await u.oc(tx, '__stop', 'state'), 2); // cancelled
        });

        it('should refund back to payers', async function () {
            let b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            let x = u.eBalance(acc[1]);
            above(x, b + 1.95);
            below(x, b + 2.05);

            b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            below(u.eBalance(acc[1]), b);

            b = u.eBalance(acc[2]);
            tx = await c.refund(hid, offchain, { from: acc[2] });
            x = u.eBalance(acc[2]);
            above(x, b + 2.95);
            below(x, b + 3.05);
        });

        it('should init a crowdsale and fully fund it', async function () {
            let goal = 10 * e, saletime = 600, deadline = 1600;
            tx = await c.initCrowdsale(goal, saletime, deadline, offchain, { from: seller });
            let time = u.latestTime();
            hid = await u.oc(tx, '__init', 'hid');

            tx = await c.shake(hid, offchain, { from: acc[1], value: 2 * e });
            tx = await c.shake(hid, offchain, { from: acc[2], value: 3 * e });
            tx = await c.shake(hid, offchain, { from: acc[3], value: 5 * e });
            eq(await u.oc(tx, '__shake', 'state'), 1); // shaked

            let timePassed = time + 1000;
            u.increaseTimeTo(timePassed);
            tx = await c.withdraw(hid, offchain, { from: seller });
        });

        it('should stop the crowdsale', async function () {
            tx = await c.stop(hid, offchain, { from: seller });
            eq(await u.oc(tx, '__stop', 'state'), 2); // cancelled
        });

        it('should refund back to payers', async function () {
            let b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            let x = u.eBalance(acc[1]);
            above(x, b + 0.8); // 0.84 +- gas
            below(x, b + 0.85);

            b = u.eBalance(acc[1]);
            tx = await c.refund(hid, offchain, { from: acc[1] });
            below(u.eBalance(acc[1]), b);

            b = u.eBalance(acc[2]);
            tx = await c.refund(hid, offchain, { from: acc[2] });
            x = u.eBalance(acc[2]);
            above(x, b + 1.25); // 1.26 +- gas
            below(x, b + 1.5);

            b = u.eBalance(acc[3]);
            tx = await c.refund(hid, offchain, { from: acc[3] });
            x = u.eBalance(acc[3]);
            above(x, b + 2.0); // 2.1 +- gas
            below(x, b + 2.2);
        });
    });
});
