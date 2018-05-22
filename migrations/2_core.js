var BasicHandshake = artifacts.require('BasicHandshake')
var PayableHandshake = artifacts.require('PayableHandshake')

module.exports = function(deployer, network, accounts) {
        deployer.deploy(BasicHandshake)
        deployer.deploy(PayableHandshake)
}
