# Solidity Examples

A collection of solidity/hardhat/ethers samples. Projects are kept simple as the focus
is less on product and more on gaining experience using different features of the
software used to develop smart contracts.

Examples and corresponding tests are located in their respective folders in the
`/contracts` and `/test` folders. Each H2 header corresponds to one example.

Instructions on how to run each example is inside the README.md in the respective folder.

## ERC20

A simple ERC20 implementation similar to the OpenZeppelin contract with a contract
that allows for both minting and burning of tokens. Total supply is monotonically
increasing (i.e. is not allowed to decrease). When tokens are burned, they are
transferred to the zero address and the token supply remains unchanged.

## Simple Staking Contract

A staking contract independent of its ERC20 token inspired by SushiSwap's MiniChefV2
contract. Rewards are issued every block that is mined.

## Reentrancy

Sample smart contract illustrating the smart contract re-entrancy attack.
A fixed version of the smart contract is also available with the contract name
`SecureContract`. The fix is to follow the checks-effects-interactions smart contract
design pattern.

## Oracle Interaction Deployment

A simple PriceConsumer contract deployed via Hardhat onto Kovan using
AlchemyFi as RPC and Etherscan for contract verification.

## Simple Index Fund

A simple implementation of an index fund contract for an individual. It only supports
two assets at a time. As a toy project, it will only work with small amounts of money
(to not be affected by UniswapV3 slippage). Interacts with ERC20 contracts, chainlink
price feeds as well as UniswapV3 for rebalancing.

The rebalancing function is hardcoded for simplicity. In practice, UniswapV3 will
not be used for rebalancing and something like SetProtocol's dutch auction will be used.
However, I think a more interesting way of rebalancing would be to onboard CoWswap
as a Keep3r and have all index funds implement an interface that allow CoWswap to
simultaneously rebalance large index funds at the same time. This has multiple benefits:
it can keep fund fees low, it will reduce slippage on rebalance (especially for large funds)
and it prevents frontrunning (e.g. if you knew the a large fund was going to rebalance,
you can frontrun them).

### Improvements

Some things that can be implemented in the future:

- keep3r integration for rebalancing
- support for multiple users beyond owner
- support for more than 2 assets
- support to allow changing of asset weights
