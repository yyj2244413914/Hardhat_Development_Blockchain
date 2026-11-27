// 一键跑完四个实验：npx hardhat run scripts/runAll.js
const exp1 = require("./exp1");
const exp2 = require("./exp2");
const exp3 = require("./exp3");
const exp4 = require("./exp4");

async function main() {
  console.log("区块链金融管理实验 —— 四个实验自动执行");
  await exp1.run();
  await exp2.run();
  await exp3.run();
  await exp4.run();
  console.log("\n全部四个实验执行完毕。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
