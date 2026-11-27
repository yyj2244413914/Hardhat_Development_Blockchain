# Hardhat 区块链金融实验

《区块链金融管理》课程实验的进阶部分——在 Remix 之外搭建 Hardhat 本地开发环境，把前四次课堂实验改写成**可重复执行的脚本**，并用**一条命令**依次跑通。

合约代码与 Remix 版本完全一致，不需要任何修改即可在两处运行（都是 Solidity 0.8.20 + Shanghai 版本的 EVM）。

---

## 一、实验内容与脚本对应

| 实验 | 金融概念 | 合约 | 脚本 |
|---|---|---|---|
| 实验一 | 账户、存取款、交易记录 | `SimpleBank.sol` | `scripts/exp1.js` |
| 实验二 | 代币发行、转账、授权代扣 | `FinanceToken.sol` | `scripts/exp2.js` |
| 实验三 | 超额抵押、计息、清算 | `SimpleLending.sol` | `scripts/exp3.js` |
| 实验四 | 资产通证化、贴现、到期赎回 | `ReceivableToken.sol` | `scripts/exp4.js` |
| 汇总 | 一条命令跑完四个实验 | —— | `scripts/runAll.js` |

---

## 二、项目结构

```
Hardhat_Development_Blockchain/
├── contracts/                 # 四个实验合约
│   ├── SimpleBank.sol         # 简易银行：存款、取款、余额查询
│   ├── FinanceToken.sol       # ERC20 代币：发行、转账、授权、增发销毁
│   ├── SimpleLending.sol      # 去中心化借贷：注资、抵押借款、计息、还款、清算
│   └── ReceivableToken.sol    # 应收账款通证：贴现定价、转让、到期赎回
├── scripts/
│   ├── exp1.js                # 实验一脚本
│   ├── exp2.js                # 实验二脚本
│   ├── exp3.js                # 实验三脚本
│   ├── exp4.js                # 实验四脚本
│   ├── runAll.js              # 一条命令依次跑完四个实验
│   └── deploy.js              # 四个合约一键部署（可选）
├── test/
│   └── lab.test.js            # 自动化测试用例（可选，5 passing）
├── hardhat.config.js          # Solidity 0.8.20，EVM 版本 shanghai
├── package.json
└── package-lock.json
```

---

## 三、运行环境

| 项目 | 版本 |
|---|---|
| Node.js | v22.23.4 |
| npm | 10.9.9 |
| Hardhat | 2.29.1 |
| ethers | 6.17.0 |
| OpenZeppelin Contracts | 5.0.0 |
| Solidity | 0.8.20（EVM 目标 shanghai） |
| 操作系统 | Windows 11（亦可在 macOS / Linux 运行） |

---

## 四、快速开始

```bash
# 1. 安装依赖
npm install

# 2. 编译四个合约
npx hardhat compile

# 3. 一条命令跑完四个实验
npx hardhat run scripts/runAll.js
```

第 2 步正常输出：

```
Compiled 10 Solidity files successfully (evm target: shanghai)
```

（10 个文件 = 4 个自写合约 + 6 个 OpenZeppelin 库文件）

第 3 步会在 Hardhat 内置的临时链上依次部署并操作四个合约，终端按“实验一 → 实验二 → 实验三 → 实验四”的顺序打印结果，最后输出：`全部四个实验执行完毕。`

> 说明：`npx hardhat run` 使用的是内置临时链，脚本跑完即销毁，**无需**先启动 `npx hardhat node`。

---

## 五、各脚本执行的操作与关键输出

### 实验一 `exp1.js` —— 简易银行

操作：账户 A 存 10 ETH → 账户 B 存 5 ETH → 账户 A 取 3 ETH → 尝试超额取款 20 ETH。

```
A 的存款余额(getMyBalance): 10000000000000000000
B 的存款余额(getMyBalance): 5000000000000000000
银行总余额(getBankBalance): 15000000000000000000
账户 A 取出 3 ETH，剩余: 7000000000000000000
超额取款 20 ETH 被拦截: Insufficient balance
累计交易笔数(totalTransactions): 3
```

### 实验二 `exp2.js` —— ERC20 代币

操作：查询代币信息 → 向 B 转 5 万枚、向 C 转 3 万枚 → B 授权 C 1 万枚、C 代扣 5000 枚 → 增发 50 万枚、销毁 10 万枚 → B 尝试增发。

```
name: FinanceToken    symbol: FTK    decimals: 18
totalSupply: 1000000000000000000000000
转账后 A / B / C: 920000… / 50000… / 30000…
approve 后 allowance: 10000000000000000000000 → 代扣后 5000000000000000000000
增发后 totalSupplyInTokens: 1500000 → 销毁后 1400000
账户 B 调用 mint 被拦截（OwnableUnauthorizedAccount）
```

### 实验三 `exp3.js` —— 去中心化借贷

操作：A 注资 50 ETH、B 注资 30 ETH → C 抵押 15 ETH 借款 → 利息随时间累积 → C 还款 11 ETH → D 抵押 6 ETH，A 尝试清算。

```
注资后 poolBalance: 80000000000000000000
C 抵押 15 ETH，借得 10 ETH，currentRatio: 150
借款后 poolBalance: 85000000000000000000
60 秒后利息增加: 951293759512
还款后 isActive: false
清算被拦截: Loan is still healthy, cannot liquidate
```

### 实验四 `exp4.js` —— 应收账款通证化

操作：发行 100 万元、年贴现率 3%、90 天到期的应收账款通证 → 转让 60 万 / 30 万枚 → 验证未到期不可赎回 → 时间快进 90 天 → 付款方注资 10 ETH → 三个持有者按份额赎回。

```
当前贴现价值: 992685
未到期赎回被拦截: Not yet due and redemption not started
到期后贴现价值: 1000000
注资后 redemptionPool: 10000000000000000000
B 赎回 60 万枚，获得 6000000000000000000，池子剩余 4000000000000000000
C 赎回 30 万枚，获得 3000000000000000000，池子剩余 1000000000000000000
A 赎回 10 万枚，获得 1000000000000000000，池子剩余 0
赎回完成后 totalSupply: 0
isRedeemed: true  池子余额: 0
```

> 注资 10 ETH 只相当于票面 100 万元的 10%，因此每位持有者只收回票面价值的 10%，其余 90% 属于违约损失；`isRedeemed = true` 只表示“代币已全部赎回、资金池已分配完毕”，不代表债权获得足额清偿。

---

## 六、单独运行某个实验

```bash
npx hardhat run scripts/exp1.js
npx hardhat run scripts/exp2.js
npx hardhat run scripts/exp3.js
npx hardhat run scripts/exp4.js
```

每个脚本都导出了 `run()`，也可以在自己的 JS 文件里 `require` 后调用。

---

## 七、可选项

### 1. 自动化测试

```bash
npx hardhat test
```

输出 5 个用例全部通过：

```
区块链金融管理实验 - 自动化测试
  √ 实验一：SimpleBank 存款、取款与超额取款拦截
  √ 实验二：FinanceToken 发行、转账、授权代扣与增发权限
  √ 实验三：SimpleLending 注资、抵押借款、计息与清算拦截
  √ 实验四：ReceivableToken 贴现定价、到期赎回与按比例分配
  √ 实验五：四个合约可一键部署到本地节点

5 passing
```

### 2. 启动本地节点并部署

```bash
# 终端 1：启动本地链（保持不关闭）
npx hardhat node

# 终端 2：部署四个合约
npx hardhat run scripts/deploy.js --network localhost
```

输出四个合约地址（同一次运行内地址固定，重启节点后重新计算）：

```
SimpleBank deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
FinanceToken deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
SimpleLending deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
ReceivableToken deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

---

## 八、与 Remix 版本的对应关系

| Remix 操作 | Hardhat 脚本对应 |
|---|---|
| Deploy 面板点 Deploy | `ethers.deployContract()` + `waitForDeployment()` |
| 填 Value 10 ether 点 deposit | `bank.deposit({ value: ethers.parseEther("10") })` |
| 点 getMyBalance（不花 Gas） | `await bank.getMyBalance()` |
| 报错红色 `Insufficient balance` | `revertedWith("Insufficient balance")` |
| 账户下拉切换 | `contract.connect(signerB)` |
| 区块时间推进（Remix 无法快进） | `network.provider.send("evm_increaseTime", [...])` |

同一批合约在 Remix VM 与 Hardhat 中的行为一致，前提是 **EVM 版本统一**：本项目在 `hardhat.config.js` 中显式指定 `evmVersion: "shanghai"`，与 Remix VM 的 Shanghai 环境对齐。若编译目标高于节点支持的 EVM 版本（例如用 0.8.34 默认的 osaka 编译，却在 Shanghai 节点上执行），会报 `invalid opcode`。

---

## 九、说明

本次进阶实验完成的是“**脚本化复现**”：把四次课堂实验改写成脚本，用一条命令跑通，并得到与 Remix 手工操作一致的结果。

常驻本地节点（`npx hardhat node`）与自动化测试（`npx hardhat test`）属于同一环境的延伸，仓库中保留了 `scripts/deploy.js` 与 `test/lab.test.js`，可直接用于后续扩展。

---

## 十、参考

- Hardhat 官方文档：<https://hardhat.org/docs>
- OpenZeppelin Contracts：<https://docs.openzeppelin.com/contracts/5.x/>
- Solidity 官方文档：<https://docs.soliditylang.org>
