const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { deployContract, loadFixture, provider } = waffle;

const InsecureContract = require("../artifacts/contracts/Reentrancy.sol/InsecureContract.json");
const ExploitContractSuccess = require("../artifacts/contracts/Reentrancy.sol/ExploitContractSuccess.json");
const SecureContract = require("../artifacts/contracts/Reentrancy.sol/SecureContract.json");
const ExploitContractFailure = require("../artifacts/contracts/Reentrancy.sol/ExploitContractFailure.json");

describe("Reentrancy Attack", async () => {

  async function setupInsecureContract(_, provider) {
    const [wallet, attacker, other] = provider.getWallets();
    const insecureContract = await deployContract(wallet, InsecureContract);
    const exploitContract = await deployContract(attacker, ExploitContractSuccess);
    return { insecureContract, exploitContract, attacker, other };
  }

  async function setupSecureContract(_, provider) {
    const [wallet, attacker, other] = provider.getWallets();
    const secureContract = await deployContract(wallet, SecureContract);
    const exploitContract = await deployContract(attacker, ExploitContractFailure);
    return { secureContract, exploitContract, attacker, other };
  }

  it("Successfully execute reentrancy attack on InsecureContract", async () => {
    const { insecureContract, exploitContract, attacker, other } = await loadFixture(setupInsecureContract);

    // set up contract
    attackerContract = await exploitContract.connect(attacker);
    await attackerContract.setInsecureContractAddress(insecureContract.address);

    // innocent third parties send eth to exploitable contract
    await other.sendTransaction({
      to: insecureContract.address,
      value: ethers.utils.parseEther("10.0")
    })

    // attacker sends eth to exploitable contract via the contract
    await attacker.sendTransaction({
      to: exploitContract.address,
      value: ethers.utils.parseEther("1.0")
    })

    // check initial balance of contract
    expect(await provider.getBalance(insecureContract.address))
      .to.equal(ethers.utils.parseEther("11.0"));

    // attacker executes contract exploit
    await attackerContract.executeWithdrawal();

    // check post-exploit balance of contract
    // amount of ether has been drained due to reentrancy exploit
    expect(await provider.getBalance(insecureContract.address))
      .to.equal(ethers.utils.parseEther("1.0"));
  });

  it("Failed to execute reentrancy attack on SecureContract", async () => {
    const { secureContract, exploitContract, attacker, other } = await loadFixture(setupSecureContract);

    // set up contract
    attackerContract = await exploitContract.connect(attacker);
    await attackerContract.setSecureContractAddress(secureContract.address);

    // innocent third parties send eth to exploitable contract
    await other.sendTransaction({
      to: secureContract.address,
      value: ethers.utils.parseEther("10.0")
    })

    // attacker sends eth to exploitable contract via the contract
    await attacker.sendTransaction({
      to: exploitContract.address,
      value: ethers.utils.parseEther("1.0")
    })

    // check initial balance of contract
    expect(await provider.getBalance(secureContract.address))
      .to.equal(ethers.utils.parseEther("11.0"));

    // attacker executes contract exploit and fails
    await expect(attackerContract.executeWithdrawal())
      .to.be.reverted;
  });

})
