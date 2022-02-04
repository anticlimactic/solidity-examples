# Oracle Deployment

Contract is deployed on Kovan at the following address:

[`0x9604fb6F569bC21D96ae9E1985BE71083F15A87f`](https://kovan.etherscan.io/address/0x9604fb6f569bc21d96ae9e1985be71083f15a87f)

## Instructions

Create a `config.js` file containing the following fields:

```
var config = module.exports = {};

config.alchemyapi = <alchemyapi kovan api here>;

config.account = {
  "mnemonic": <insert mnemonic here>,
  "path": "m/44'/60'/0'/0",
  "initialIndex": 0,
  "count": 20
};

config.kovan = <etherscan kovan api here>;
```

To deploy the contract, run:

`npx hardhat run --network kovan scripts/deploy.js`

To verify the contract, run:

`npx hardhat verify --network kovan <contract name>`
