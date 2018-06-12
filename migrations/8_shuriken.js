var Shuriken = artifacts.require('Shuriken');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Shuriken);
};
