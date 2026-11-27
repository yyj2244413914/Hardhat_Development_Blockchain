// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleLending - 简易去中心化借贷协议
 * @notice 模拟 DeFi 借贷核心流程：存款 → 抵押借款 → 计息 → 还款
 * @dev 用于《区块链金融》课程实验三
 *      简化了 Aave/Compound 的核心机制
 */
contract SimpleLending {
    // 借款记录结构体
    struct Loan {
        uint256 collateral;     // 抵押品金额（wei）
        uint256 borrowed;       // 借款金额（wei）
        uint256 startTime;      // 借款开始时间（时间戳）
        bool active;            // 贷款是否活跃
    }

    // 存款记录
    mapping(address => uint256) public deposits;
    // 借款记录
    mapping(address => Loan) public loans;

    // 协议参数
    uint256 public constant COLLATERAL_RATIO = 150;      // 抵押率 150%
    uint256 public constant ANNUAL_RATE = 5;             // 年利率 5%
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 清算线 120%

    // 协议统计
    uint256 public totalDeposited;
    uint256 public totalBorrowed;

    // 事件
    event DepositMade(address indexed user, uint256 amount);
    event LoanCreated(address indexed borrower, uint256 collateral, uint256 borrowed);
    event LoanRepaid(address indexed borrower, uint256 repaid, uint256 interest);
    event LoanLiquidated(address indexed borrower, address indexed liquidator, uint256 collateral);

    /**
     * @notice 存款 - 向流动性池中注入资金
     * @dev 存款人的资金供借款人借用
     */
    function depositToPool() public payable {
        require(msg.value > 0, "Amount must be > 0");
        deposits[msg.sender] += msg.value;
        totalDeposited += msg.value;
        emit DepositMade(msg.sender, msg.value);
    }

    /**
     * @notice 抵押借款 - 发送 ETH 作为抵押品，借出相应金额
     * @dev 借款金额 = 抵押品 × 100 / 抵押率
     *      如抵押 1.5 ETH，抵押率 150%，可借出 1 ETH
     */
    function borrow() public payable {
        require(msg.value > 0, "Collateral must be > 0");
        require(!loans[msg.sender].active, "Already have an active loan");

        uint256 borrowAmount = (msg.value * 100) / COLLATERAL_RATIO;
        require(
            address(this).balance - msg.value >= borrowAmount,
            "Insufficient liquidity in pool"
        );

        loans[msg.sender] = Loan({
            collateral: msg.value,
            borrowed: borrowAmount,
            startTime: block.timestamp,
            active: true
        });
        totalBorrowed += borrowAmount;

        payable(msg.sender).transfer(borrowAmount);
        emit LoanCreated(msg.sender, msg.value, borrowAmount);
    }

    /**
     * @notice 还款 - 归还借款本金 + 利息，取回抵押品
     * @dev 利息 = 本金 × 年利率 × 借款时长 / (365 天 × 100)
     */
    function repay() public payable {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active loan");

        uint256 interest = calculateInterest(msg.sender);
        uint256 totalDue = loan.borrowed + interest;
        require(msg.value >= totalDue, "Insufficient repayment amount");

        uint256 collateralReturn = loan.collateral;

        // 更新状态
        totalBorrowed -= loan.borrowed;
        loan.active = false;
        loan.collateral = 0;
        loan.borrowed = 0;

        // 退还抵押品
        payable(msg.sender).transfer(collateralReturn);

        // 退还多付的部分
        if (msg.value > totalDue) {
            payable(msg.sender).transfer(msg.value - totalDue);
        }

        emit LoanRepaid(msg.sender, totalDue, interest);
    }

    /**
     * @notice 清算 - 当抵押率低于清算线时，任何人都可以发起清算
     * @param borrower 被清算借款人的地址
     * @dev 简化模型：清算人获得抵押品，借款人贷款关闭
     *      本实验中通过手动模拟“价格下跌”触发清算
     */
    function liquidate(address borrower) public {
        Loan storage loan = loans[borrower];
        require(loan.active, "No active loan for this borrower");

        // 简化模型：直接检查当前抵押率是否低于清算线
        // 真实 DeFi 中会通过预言机获取实时价格
        uint256 currentRatio = (loan.collateral * 100) / loan.borrowed;
        require(
            currentRatio <= LIQUIDATION_THRESHOLD,
            "Loan is still healthy, cannot liquidate"
        );

        uint256 collateral = loan.collateral;
        totalBorrowed -= loan.borrowed;
        loan.active = false;
        loan.collateral = 0;
        loan.borrowed = 0;

        // 清算人获得抵押品
        payable(msg.sender).transfer(collateral);
        emit LoanLiquidated(borrower, msg.sender, collateral);
    }

    /**
     * @notice 计算某借款人的当前应付利息
     * @param user 借款人地址
     * @return 利息金额（wei）
     */
    function calculateInterest(address user) public view returns (uint256) {
        Loan storage loan = loans[user];
        if (!loan.active) return 0;
        uint256 duration = block.timestamp - loan.startTime;
        return (loan.borrowed * ANNUAL_RATE * duration) / (365 days * 100);
    }

    /**
     * @notice 查询借款人的贷款详情
     */
    function getLoanDetails(address user) public view returns (
        uint256 collateral,
        uint256 borrowed,
        uint256 currentInterest,
        uint256 currentRatio,
        bool isActive
    ) {
        Loan storage loan = loans[user];
        uint256 interest = calculateInterest(user);
        uint256 ratio = loan.borrowed > 0 ? (loan.collateral * 100) / loan.borrowed : 0;
        return (loan.collateral, loan.borrowed, interest, ratio, loan.active);
    }

    /**
     * @notice 查询协议总览
     */
    function getProtocolStats() public view returns (
        uint256 poolBalance,
        uint256 totalDeposits,
        uint256 totalLoans
    ) {
        return (address(this).balance, totalDeposited, totalBorrowed);
    }
}
