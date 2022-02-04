# Instructions

`InsecureContract` contains the re-entrancy exploit. `SecureContract` is similar
to `InsecureContract` but is restructured using the require-effects-interaction
smart contract pattern which prevents the re-entrancy exploit from taking place.

To compile:

`npx hardhat compile`

To test:

`npx hardhat test`
