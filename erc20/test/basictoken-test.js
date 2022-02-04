const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { constants } = ethers;
const { deployContract, loadFixture } = waffle;
const BasicToken = require("../artifacts/contracts/BasicToken.sol/BasicToken.json");

describe("BasicToken", async () => {

  async function setup(_, provider) {
    const [wallet, from, to] = provider.getWallets();
    const tokenContract = await deployContract(wallet, BasicToken, [
      "Basic Token", "BST", 18
    ]);
    return { tokenContract, wallet, from, to };
  }

  async function setupWithBalances(_, provider) {
    // initialises from & to wallet with 10000 tokens
    const [wallet, from, to, other] = provider.getWallets();
    const tokenContract = await deployContract(wallet, BasicToken, [
      "Basic Token", "BST", 18
    ]);
    await tokenContract.mint(from.address, ethers.utils.parseUnits("10000"));
    await tokenContract.mint(to.address, ethers.utils.parseUnits("10000"));
    return { tokenContract, wallet, from, to, other };
  }

  it("Can fetch ERC20 Metadata", async () => {
    const { tokenContract } = await loadFixture(setup);

    expect(await tokenContract.name()).to.equal("Basic Token");
    expect(await tokenContract.symbol()).to.equal("BST");
    expect(await tokenContract.decimals()).to.equal(18);
  });

  it("Can mint tokens", async() => {
    const { tokenContract, from } = await loadFixture(setup);

    await expect(tokenContract.mint(from.address, ethers.utils.parseUnits("10000")))
      .to.emit(tokenContract, "Transfer")
      .withArgs(constants.AddressZero, from.address, ethers.utils.parseUnits("10000"));

    expect(await tokenContract.totalSupply())
      .to.equal(ethers.utils.parseUnits("10000"));
    expect(await tokenContract.balanceOf(from.address))
      .to.equal(ethers.utils.parseUnits("10000"));
  });

  it("Cannot mint tokens unless owner", async() => {
    const { tokenContract, from } = await loadFixture(setup);
    const fromContract = tokenContract.connect(from);
    await expect(fromContract.mint(from.address, ethers.utils.parseUnits("10000")))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Can burn tokens", async() => {
    const { tokenContract, from, to } = await loadFixture(setupWithBalances);
    const fromContract = await tokenContract.connect(from);

    await expect(fromContract.burn(ethers.utils.parseUnits("1000")))
      .to.emit(fromContract, "Transfer")
      .withArgs(from.address, constants.AddressZero, ethers.utils.parseUnits("1000"));

    expect(await tokenContract.balanceOf(constants.AddressZero))
      .to.equal(ethers.utils.parseUnits("1000"));
    expect(await tokenContract.balanceOf(from.address))
      .to.equal(ethers.utils.parseUnits("9000"));
  });

  it("Can transfer tokens", async() => {
    const { tokenContract, from, to } = await loadFixture(setupWithBalances);
    const fromContract = tokenContract.connect(from);

    await expect(fromContract.transfer(to.address, ethers.utils.parseUnits("1000")))
      .to.emit(fromContract, "Transfer")
      .withArgs(from.address, to.address, ethers.utils.parseUnits("1000"))

    expect(await fromContract.balanceOf(from.address))
      .to.equal(ethers.utils.parseUnits("9000"));
    expect(await fromContract.balanceOf(to.address))
      .to.equal(ethers.utils.parseUnits("11000"));
  });

  it("Can approve and transfer tokens on behalf of others", async() => {
    // enable other to transfer tokens belonging to from
    const { tokenContract, from, to, other } = await loadFixture(setupWithBalances);
    const fromContract = tokenContract.connect(from);
    const otherContract = tokenContract.connect(other);

    // submit approval
    await expect(fromContract.approve(other.address, ethers.utils.parseUnits("1000")))
      .to.emit(fromContract, "Approval")
      .withArgs(from.address, other.address, ethers.utils.parseUnits("1000"));

    // check approval
    expect(await tokenContract.allowance(from.address, other.address))
      .to.equal(ethers.utils.parseUnits("1000"));

    // test transfer to other user "to"
    await expect(otherContract.transferFrom(from.address, to.address, ethers.utils.parseUnits("1000")))
      .to.emit(otherContract, "Transfer")
      .withArgs(from.address, to.address, ethers.utils.parseUnits("1000"));
    expect(await tokenContract.balanceOf(from.address))
      .to.equal(ethers.utils.parseUnits("9000"));
    expect(await tokenContract.balanceOf(to.address))
      .to.equal(ethers.utils.parseUnits("11000"));

    // check approval has decremented
    expect(await tokenContract.allowance(from.address, other.address))
      .to.equal(0);

    // test failed transfer to other user "to"
    await expect(otherContract.transferFrom(from.address, to.address, ethers.utils.parseUnits("1000")))
      .to.revertedWith("ERC20: Insufficient funds approved for transfer.")
  });

})
