// SPDX-License-Identifier: MIT
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const bank = await hre.ethers.deployContract("SimpleBank");
  await bank.waitForDeployment();
  console.log("SimpleBank deployed to:", await bank.getAddress());

  const token = await hre.ethers.deployContract("FinanceToken");
  await token.waitForDeployment();
  console.log("FinanceToken deployed to:", await token.getAddress());

  const lending = await hre.ethers.deployContract("SimpleLending");
  await lending.waitForDeployment();
  console.log("SimpleLending deployed to:", await lending.getAddress());

  const receivable = await hre.ethers.deployContract("ReceivableToken", [
    "China Mobile",
    "5G base station equipment payment",
    1000000,
    90,
    3,
  ]);
  await receivable.waitForDeployment();
  console.log("ReceivableToken deployed to:", await receivable.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
