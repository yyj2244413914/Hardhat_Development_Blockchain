// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReceivableToken - 应收账款通证化合约
 * @notice 将一笔应收账款转化为可分割、可流通的代币
 * @dev 用于《区块链金融》课程实验四
 *
 * 业务场景：
 * 供应商 A 向核心企业 B 销售了一批货物，B 承诺 90 天后付款 100 万元。
 * A 将这笔应收账款通证化，发行 100 万枚 RCT 代币。
 * A 可以将部分代币转让给投资者 C，C 以贴现价买入，到期后按面值赎回获利。
 */
contract ReceivableToken is ERC20, Ownable {
    // 应收账款基本信息
    struct ReceivableInfo {
        string debtor;              // 付款方（核心企业）名称
        string description;         // 应收账款描述
        uint256 faceValue;          // 票面价值（代币总量 = 票面价值）
        uint256 issueDate;          // 发行日期（时间戳）
        uint256 dueDate;            // 到期日期（时间戳）
        uint256 annualDiscountRate; // 年贴现率（百分比，如 3 表示 3%）
        bool isRedeemed;            // 是否已赎回
    }

    ReceivableInfo public receivable;

    // 赎回资金池（到期后由付款方存入）
    uint256 public redemptionPool;

    // 事件
    event ReceivableIssued(string debtor, uint256 faceValue, uint256 dueDate);
    event RedemptionFunded(uint256 amount);
    event TokensRedeemed(address indexed holder, uint256 tokenAmount, uint256 ethReceived);

    /**
     * @notice 构造函数 - 创建应收账款通证
     * @param _debtor 付款方名称
     * @param _description 应收账款描述
     * @param _faceValue 票面价值（同时作为代币发行总量）
     * @param _daysUntilDue 距到期的天数
     * @param _annualDiscountRate 年贴现率
     */
    constructor(
        string memory _debtor,
        string memory _description,
        uint256 _faceValue,
        uint256 _daysUntilDue,
        uint256 _annualDiscountRate
    ) ERC20("ReceivableToken", "RCT") Ownable(msg.sender) {
        receivable = ReceivableInfo({
            debtor: _debtor,
            description: _description,
            faceValue: _faceValue,
            issueDate: block.timestamp,
            dueDate: block.timestamp + (_daysUntilDue * 1 days),
            annualDiscountRate: _annualDiscountRate,
            isRedeemed: false
        });

        // 发行代币：票面价值 = 代币总量（每枚代币代表 1 元）
        _mint(msg.sender, _faceValue * 10 ** decimals());
        emit ReceivableIssued(_debtor, _faceValue, receivable.dueDate);
    }

    /**
     * @notice 计算当前贴现价值
     * @dev 贴现价值 = 票面价值 - (票面价值 × 年贴现率 × 剩余天数 / 365 / 100)
     */
    function getCurrentDiscountedValue() public view returns (uint256) {
        if (block.timestamp >= receivable.dueDate) {
            return receivable.faceValue; // 到期后为票面价值
        }
        uint256 remainingDays = (receivable.dueDate - block.timestamp) / 1 days;
        uint256 discount = (receivable.faceValue * receivable.annualDiscountRate * remainingDays) / (365 * 100);
        return receivable.faceValue - discount;
    }

    /**
     * @notice 模拟到期付款 - 付款方（核心企业）存入赎回资金
     */
    function fundRedemption() public payable {
        require(msg.value > 0, "Must send ETH");
        redemptionPool += msg.value;
        emit RedemptionFunded(msg.value);
    }

    /**
     * @notice 赎回 - 代币持有者用代币兑换赎回资金
     * @param tokenAmount 要赎回的代币数量（含 decimals）
     */
    function redeem(uint256 tokenAmount) public {
        require(receivable.isRedeemed || block.timestamp >= receivable.dueDate,
            "Not yet due and redemption not started");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        require(redemptionPool > 0, "Redemption pool is empty");

        // 按比例计算可赎回的 ETH
        uint256 ethAmount = (tokenAmount * redemptionPool) / totalSupply();
        require(ethAmount > 0, "Redeem amount too small");

        // 销毁代币
        _burn(msg.sender, tokenAmount);
        redemptionPool -= ethAmount;

        // 发放 ETH
        payable(msg.sender).transfer(ethAmount);
        emit TokensRedeemed(msg.sender, tokenAmount, ethAmount);

        // 如果所有代币都已赎回，标记为已完成
        if (totalSupply() == 0) {
            receivable.isRedeemed = true;
        }
    }

    /**
     * @notice 查询应收账款完整信息
     */
    function getReceivableInfo() public view returns (
        string memory debtor,
        string memory description,
        uint256 faceValue,
        uint256 issueDate,
        uint256 dueDate,
        uint256 annualDiscountRate,
        uint256 currentDiscountedValue,
        bool isRedeemed,
        uint256 poolBalance
    ) {
        return (
            receivable.debtor,
            receivable.description,
            receivable.faceValue,
            receivable.issueDate,
            receivable.dueDate,
            receivable.annualDiscountRate,
            getCurrentDiscountedValue(),
            receivable.isRedeemed,
            redemptionPool
        );
    }

    /**
     * @notice 查询代币持有者的持有量和应得赎回金额
     */
    function getHolderInfo(address holder) public view returns (
        uint256 tokenBalance,
        uint256 estimatedRedemption
    ) {
        uint256 balance = balanceOf(holder);
        uint256 estimated = totalSupply() > 0 ? (balance * redemptionPool) / totalSupply() : 0;
        return (balance, estimated);
    }
}
