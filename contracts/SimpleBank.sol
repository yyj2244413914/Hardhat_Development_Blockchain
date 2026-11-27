// SPDX-License-Identifier: MIT
// 👉 SPDX 许可证声明：本代码使用 MIT 开源协议，允许自由使用、修改、分发，保留版权声明即可
pragma solidity ^0.8.20;
// 👉 编译器版本声明：只能用 0.8.20 及以上、小于 0.9.0 的 solidity 编译器；^ 代表向上兼容次版本
// 0.8 开始内置溢出/下溢检查，不再需要 SafeMath

/**
 * @title SimpleBank - 简易银行合约
 * @notice 本合约模拟银行的基本功能：存款、取款、查询余额
 * @dev 用于《区块链金融》课程实验一
 */
// 👉 NatSpec 注释，solidity 标准文档注释
// @title：合约名称
// @notice：给使用者看的说明
// @dev：给开发者看的内部备注
contract SimpleBank {
    // 👉 关键字 contract 代表开始定义一个合约，等价于面向对象里的类，部署后成为链上地址

    // 存储每个账户的余额，mapping相当于一个"账户→余额"的对照表
    mapping(address => uint256) private balances;
    // 👉 mapping(键类型 => 值类型)：链上持久化哈希表，存在合约存储 storage
    // key：address 用户钱包地址；value：uint256，余额，单位 wei
    // private：仅合约内部可以访问，外部不能直接读取，只能通过写好的函数查询

    // 记录银行的总存款笔数
    uint256 public totalTransactions;
    // 👉 uint256：无符号 256 位整数
    // public：自动生成一个同名 getter 函数，外部可以直接读取这个变量

    // 事件：当有人存款时触发，可在链上被查询
    event Deposit(address indexed account, uint256 amount, uint256 timestamp);
    // 👉 event：链上事件，写入交易日志，不占用合约存储，适合前端监听
    // indexed：索引，最多一个事件放 3 个 indexed 参数；可以按这个地址过滤日志

    // 事件：当有人取款时触发
    event Withdrawal(address indexed account, uint256 amount, uint256 timestamp);

    /**
     * @notice 存款函数 - 向银行存入ETH
     * @dev payable修饰符表示这个函数可以接收ETH
     */
    function deposit() public payable {
        // function：定义函数
        // deposit()：函数名，无入参
        // public：任何人都可以调用
        // payable：核心！允许调用该函数时附带发送 ETH（msg.value）
        require(msg.value > 0, "Deposit amount must be greater than 0");
        // require(条件, 报错信息)：条件不满足就回滚交易，状态复原，返回错误字符串
        // msg.value：本次调用附带发送的 ETH，单位 wei
        balances[msg.sender] += msg.value;
        // msg.sender：调用这个函数的钱包地址
        // 在 mapping 里给调用者增加余额记录
        totalTransactions += 1;
        // 交易计数 +1，存款算一笔交易
        emit Deposit(msg.sender, msg.value, block.timestamp);
        // emit：抛出事件，写入链日志
        // block.timestamp：当前区块的时间戳（从 1970-01-01 起的秒数）
    }

    /**
     * @notice 取款函数 - 从银行取出指定数量的ETH
     * @param amount 取款金额（单位：wei）
     */
    function withdraw(uint256 amount) public {
        // 参数 amount：要取多少钱，wei
        require(amount > 0, "Withdrawal amount must be greater than 0");
        // 不能取 0
        require(balances[msg.sender] >= amount, "Insufficient balance");
        // 判断合约里记录的该用户余额够不够取款
        balances[msg.sender] -= amount;
        // 先扣账本上的余额（先改状态，再转账，经典 Checks-Effects-Interactions 模式，防重入）
        totalTransactions += 1;
        // 取款也算一笔交易
        payable(msg.sender).transfer(amount);
        // transfer：向地址转账 ETH；必须把 address 转成 payable 才可以收币
        // transfer 如果转账失败（比如合约拒绝接收eth）会自动 revert
        emit Withdrawal(msg.sender, amount, block.timestamp);
        // 抛出取款事件
    }

    /**
     * @notice 查询调用者自己的余额
     * @return 当前账户在银行中的余额（单位：wei）
     */
    function getMyBalance() public view returns (uint256) {
        // view：只读函数，不修改合约存储，不需要发送交易、不用 gas
        // returns (uint256)：返回值类型
        return balances[msg.sender];
        // 返回当前调用者在银行账本里登记的余额
    }

    /**
     * @notice 查询银行合约本身持有的ETH总额
     * @return 合约地址中的ETH余额
     */
    function getBankBalance() public view returns (uint256) {
        return address(this).balance;
        // address(this)：当前合约自己的地址
        // .balance：这个地址上实际持有的 ETH 总量（wei）
    }
}
