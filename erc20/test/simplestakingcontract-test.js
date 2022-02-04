const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { deployContract, loadFixture } = waffle;
const BasicToken = require("../artifacts/contracts/BasicToken.sol/BasicToken.json");
const SimpleStakingContract = require("../artifacts/contracts/SimpleStakingContract.sol/SimpleStakingContract.json");

describe("SimpleStakingContract", async () => {

  // helper function to mine n blocks
  async function mineNBlocks(n) {
    for (let i = 0; i < n; i++) {
      await ethers.provider.send("evm_mine");
    }
  }

  async function setup(_, provider) {
    const [wallet, from, to] = provider.getWallets();
    // setup token contract with tokens
    const tokenContract = await deployContract(wallet, BasicToken, [
      "Basic Token", "BST", 18
    ]);
    await tokenContract.mint(from.address, ethers.utils.parseUnits("10000"));
    await tokenContract.mint(to.address, ethers.utils.parseUnits("10000"));

    // setup staking contract
    const stakingContract = await deployContract(wallet, SimpleStakingContract, [
      ethers.utils.parseUnits("10"),
    ]);
    await stakingContract.setTokenContractAddress(tokenContract.address, 18);
    // give tokens to staking contract to pay out as reward
    await tokenContract.mint(stakingContract.address, ethers.utils.parseUnits("10000"));

    // setup approvals
    const fromContract = tokenContract.connect(from);
    const toContract = tokenContract.connect(to);
    const MAX_INT = ethers.BigNumber.from("10").pow(30);
    await fromContract.approve(stakingContract.address, MAX_INT);
    await toContract.approve(stakingContract.address, MAX_INT);

    return { stakingContract, tokenContract, wallet, from, to };
  }

  it("Deposit and stake tokens successfully.", async () => {
    const { stakingContract, from } = await loadFixture(setup);
    const fromSC = stakingContract.connect(from);

    await expect(fromSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(from.address, ethers.utils.parseUnits("10000"));

    expect(await stakingContract.balanceOf(from.address))
      .to.equal(ethers.utils.parseUnits("10000"));

    await mineNBlocks(1);

    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("10"));
  });

  it("More than one depositor can stake successfully", async() => {
    const { stakingContract, from, to } = await loadFixture(setup);
    const fromSC = stakingContract.connect(from);
    const toSC = stakingContract.connect(to);

    // mined in block x
    await expect(fromSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(from.address, ethers.utils.parseUnits("10000"));

    // mined in block x + 1
    await expect(toSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(to.address, ethers.utils.parseUnits("10000"));

    // mine block x + 2
    await mineNBlocks(1);

    // from should have 1 full block reward + half block reward
    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("15"));
    // to should have half block reward
    expect(await stakingContract.pendingRewards(to.address))
      .to.equal(ethers.utils.parseUnits("5"));
  });

  it("Withdraw tokens after unstaking.", async() => {
    const { stakingContract, from, to } = await loadFixture(setup);
    const fromSC = stakingContract.connect(from);
    const toSC = stakingContract.connect(to);

    await expect(fromSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(from.address, ethers.utils.parseUnits("10000"));

    await expect(toSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(to.address, ethers.utils.parseUnits("10000"));

    await mineNBlocks(1);

    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("15"));

    await expect(fromSC.withdraw(ethers.utils.parseUnits("5000")))
      .to.emit(stakingContract, "Withdraw")
      .withArgs(from.address, ethers.utils.parseUnits("5000"));

    await mineNBlocks(1);

    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("13.33333333333333"));
  });

  it("Claim staking rewards.", async() => {
    const { stakingContract, from, to } = await loadFixture(setup);
    const fromSC = stakingContract.connect(from);
    const toSC = stakingContract.connect(to);

    await expect(fromSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(from.address, ethers.utils.parseUnits("10000"));

    await expect(toSC.deposit(ethers.utils.parseUnits("10000")))
      .to.emit(stakingContract, "Stake")
      .withArgs(to.address, ethers.utils.parseUnits("10000"));

    await mineNBlocks(10);

    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("60"));

    await expect(fromSC.claim())
      .to.emit(stakingContract, "Claim")
      .withArgs(from.address, ethers.utils.parseUnits("65"));

    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(0);
  });

  it("Changing stake rewards adjusts rewards appropriately", async() => {
    const { stakingContract, wallet, from } = await loadFixture(setup);
    const walletSC = stakingContract.connect(wallet);
    const fromSC = stakingContract.connect(from);

    // block x
    await expect(fromSC.deposit(10000))
      .to.emit(stakingContract, "Stake")
      .withArgs(from.address, 10000);

    // block x + 1
    await expect(await walletSC.setStakingReward(ethers.utils.parseUnits("20")))
      .to.emit(stakingContract, "LogSetStakingReward")
      .withArgs(ethers.utils.parseUnits("20"));

    // expect 10 (curr block is x + 1)
    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("10"));

    // mine block x + 2
    await mineNBlocks(1);

    // expect 30 (1 block with 10 reward, 1 block with 20 reward)
    expect(await stakingContract.pendingRewards(from.address))
      .to.equal(ethers.utils.parseUnits("30"));
  });

})
