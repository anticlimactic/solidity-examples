const hre = require("hardhat");

async function main () {
  const PriceConsumer = await hre.ethers.getContractFactory("PriceConsumer");
  const priceConsumer = await PriceConsumer.deploy();

  console.log("PriceConsumer deployed to: ", priceConsumer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
