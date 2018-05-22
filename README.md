<p align="center">
  <img src="https://raw.githubusercontent.com/cryptonomous/handshake/master/logo.png">
</p>

-----------------

# Handshake (Crypto signature)

Handshake is implemented as an Ethereum smart contract written in [Solidity](https://github.com/ethereum/solidity).
For basic handshakes that involve no payment, we provide the contract [BasicHandshake](contracts/BasicHandshake.sol) to facilitate an agreement between 2 parties.
For a more advanced use-case which involves a payment (currently in ETH), [PayableHandshake](contracts/PayableHandshake.sol) receives an escrow and locks it for a specified window of time. To protect users' payment, the contract only transfers the payment when both parties agree with each other.

## Basic handshake

One party starts by initiating a Handshake. They are given the option to set deadlines, describe an agreement or upload a document if necessary. The second party will receive a notification that the Handshake has been initiated, after which they will be able to respond with their own blockchain-secured signature.

#### API

---
```javascript
function init(address acceptor, bytes32 offchain) public
```

Initiate a Handshake with the address of initiator and acceptor (the other party).
Offchain refers to the record in the offchain backend database.

---
```javascript
function shake(uint hid, bytes32 offchain) public
```

This action details the response: Handshaking with the Handshake ID (hid) that initiated the Handshake.

---
## Payable handshake

This contract allows two parties (payer & payee) to sign off on an agreement that involves payment - typically to do with a product delivered or services rendered.
To initiate a Handshake (go to Shake state): the payee proposes a Handshake (init) and the payer agrees to sign off on it (Shake).
When payee delivers the item/service detailed in the agreement within the deadline, the Payer is given the option to reject or do nothing.
If nothing is done after 7 days, the Handshake will be Accepted.
After this time, the Payee will be able to withdraw funds immediately.
If the Payee rejects the item/service, there will be 14 days for both parties to work out a resolution.
After that time, if the item/services remain rejected, the contract terminates.

<p align="center">
  <img src="https://raw.githubusercontent.com/cryptonomous/handshake/master/flow.png">
</p>

#### API

---
```javascript
function init(address payer, uint value, uint deadline, bytes32 offchain) public
```
Payee initiates a Handshake to Payer, detailing a specified value and deadline.

---
```javascript
function initByPayer(address payee, uint value, uint deadline,bytes32 offchain) public payable
```
Payer initiates Handshake to Payee’s address.
ETH is set in escrow, and with an accompanying deadline, after which payment will be delivered.

---
```javascript
function shake(uint hid, bytes32 offchain) public payable
```
Payer accepts a Handshake and places enough ETH in escrow to cover the value specified.

---
```javascript
function deliver(uint hid, bytes32 offchain) public
```
After the item/service has been delivered to the Payer, a notification will be sent to the Payer to review it within 7 days.

---
```javascript
function withdraw(uint hid, bytes32 offchain) public
```
Payee withdraws the escrowed ETH after the work detailed in the agreement has been reviewed by the Payer, or after 7 days have elapsed.

---
```javascript
function reject(uint hid, bytes32 offchain) public
```
Payer rejects delivered product.

---
```javascript
function accept(uint hid, bytes32 offchain) public
```
Payer accepts the delivered product.

---
```javascript
function cancel(uint hid, bytes32 offchain) public
```
Payer cancels Handshake and withdraws the escrowed ETH.

---
## Setup

* Clone this repository.
* Install dependency packages:

```bash
    cd handshake/
    npm install
```

* Compile contracts

```bash
    truffle compile --all
```

* Deploy contracts

```bash
    truffle migrate --reset
```

* Run unit tests:

```bash
    truffle test "test/basic.js"
    truffle test "test/payable.js"
```

## Contributing

All contributions, feature requests and issue reports are welcome. [Create an issue](https://github.com/cryptonomous/handshake/issues) to submit your requests or notify us of a bug.
If you would like to add a feature, [make a pull request](https://github.com/cryptonomous/handshake/pulls).
Thanks for trying Handshake! Join the conversation on Telegram: https://t.me/handshakeontheblockchain
