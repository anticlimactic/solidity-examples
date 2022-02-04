# Instructions

Some additional explanation may be required on how staking rewards are calculated.
We have a variable `accRewardPerShare` that is updated every time a significant
event takes place (i.e. total supply changes or block reward changes). This variable
controls the amount of reward that is owed to each staked token in the pool, accumulated
over time. To offset this value, newer users accrue a `rewardDebt` that "zeroes" their
balance. In this way, you can keep tabs on user rewards in a gas efficient way.

To compile:

`npx hardhat compile`

To test:

`npx hardhat test`
