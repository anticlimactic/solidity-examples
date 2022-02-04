# Instructions

Create a `config.js` file containing the following fields:

```
var config = module.exports = {};

config.alchemyapi = <alchemyapi kovan api here>;
```

This was tested by mainnet forking and pinning to block `14118830`.

The usual hardhat compile and test functions work.

`npx hardhat compile`

`npx hardhat test`
