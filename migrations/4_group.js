var GroupHandshake = artifacts.require('GroupHandshake');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(GroupHandshake);
};
