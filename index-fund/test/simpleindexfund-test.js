const { expect } = require("chai");
const { ethers, waffle, network } = require("hardhat");
const { deployContract, loadFixture } = waffle;
const SimpleIndexFund = require("../artifacts/contracts/SimpleIndexFund.sol/SimpleIndexFund.json");
const IERC20 = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

describe("Simple Index Fund", async() => {

  // mainnet token addresses
  const WBTCContract = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
  const WETHContract = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // mainnet oracle addresses
  const BTCOracle = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";
  const ETHOracle = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

  const MaxInt = ethers.BigNumber.from("10").pow(30);

  async function setup(_, provider) {
    const [wallet] = provider.getWallets();
    const simpleIndexFund = await deployContract(wallet, SimpleIndexFund);
    return { simpleIndexFund, wallet };
  }

  async function setupWithAssets(_, _) {
    // setup account with assets
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2"]
    });
    const wallet = await ethers.getSigner("0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2");
    const simpleIndexFund = await (await deployContract(wallet, SimpleIndexFund)).connect(wallet);

    // add wbtc and weth with a 60/40 weighting
    await simpleIndexFund.add(WBTCContract, BTCOracle, 60, 8);
    await simpleIndexFund.add(WETHContract, ETHOracle, 40, 18);

    // connect to wbtc/weth erc20 contracts and get approvals to transfer wbtc/weth
    const wbtcContract = (await ethers.getContractAt(IERC20.abi, WBTCContract)).connect(wallet);
    const wethContract = (await ethers.getContractAt(IERC20.abi, WETHContract)).connect(wallet);

    await wbtcContract.approve(simpleIndexFund.address, MaxInt);
    await wethContract.approve(simpleIndexFund.address, MaxInt);

    return { wallet, simpleIndexFund, wbtcContract, wethContract };
  }

  it("Can add asset to simple index fund", async() => {
    const { simpleIndexFund, wallet } = await loadFixture(setup);
    const walletContract = simpleIndexFund.connect(wallet);

    await expect(walletContract.add(WBTCContract, BTCOracle, 60, 8))
      .to.emit(walletContract, "AddAsset")
      .withArgs(WBTCContract, BTCOracle, 60, 8);

    await expect(walletContract.add(WETHContract, ETHOracle, 40, 18))
      .to.emit(walletContract, "AddAsset")
      .withArgs(WETHContract, ETHOracle, 40, 18);
  });

  it("Can deposit assets to simple index fund", async() => {
    const { simpleIndexFund, wbtcContract } = await loadFixture(setupWithAssets);

    // deposit wbtc
    await expect(simpleIndexFund.deposit(0, ethers.utils.parseUnits("10", 8)))
      .to.emit(simpleIndexFund, "Deposit")
      .withArgs(0, ethers.utils.parseUnits("10", 8));

    // check wbtc fund accounting is correct
    expect(await simpleIndexFund.balanceOf(0))
      .to.equal(ethers.utils.parseUnits("10", 8));
  });

  it("Can withdraw assets to simple index fund", async() => {
    const { wallet, simpleIndexFund, wbtcContract } = await loadFixture(setupWithAssets);

    // deposit wbtc
    await expect(simpleIndexFund.deposit(0, ethers.utils.parseUnits("10", 8)))
      .to.emit(simpleIndexFund, "Deposit")
      .withArgs(0, ethers.utils.parseUnits("10", 8));

    // withdraw half of the wbtc
    await expect(simpleIndexFund.withdraw(0, ethers.utils.parseUnits("5", 8),
      wallet.address))
      .to.emit(simpleIndexFund, "Withdraw")
      .withArgs(0, ethers.utils.parseUnits("5", 8), wallet.address);

    expect(await simpleIndexFund.balanceOf(0))
      .to.equal(ethers.utils.parseUnits("5", 8));
  });

  it("Can rebalance assets according to weights", async() => {
    const { wallet, simpleIndexFund, wbtcContract } = await loadFixture(setupWithAssets);

    // deposit wbtc
    await expect(simpleIndexFund.deposit(0, ethers.utils.parseUnits("1", 8)))
      .to.emit(simpleIndexFund, "Deposit")
      .withArgs(0, ethers.utils.parseUnits("1", 8));

    expect(await simpleIndexFund.rebalance())
      .to.emit(simpleIndexFund, "LogRebalance");

    // check allocation is 60% btc
    expect(await simpleIndexFund.balanceOf(0))
      .to.equal(ethers.utils.parseUnits(".6", 8));

    // and approximately 40% eth (not perfectly as some slippage)
    let wethBalance = await simpleIndexFund.balanceOf(1);
    let diff = wethBalance.sub(ethers.utils.parseUnits("5.6", 18)).abs();
    expect(diff).to.be.at.most(ethers.utils.parseUnits(".1"))
  });

})
