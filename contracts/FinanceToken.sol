// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 从 OpenZeppelin 库导入 ERC20 标准实现和权限控制模块
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FinanceToken - 金融实验代币
 * @notice 模拟代币发行场景，用于理解 Token 经济机制
 * @dev 继承 ERC20 标准，附加铸造与销毁功能
 */
contract FinanceToken is ERC20, Ownable {
    // 记录代币发行的描述信息
    string public tokenDescription;

    // 事件：增发
    event TokensMinted(address indexed to, uint256 amount);
    // 事件：销毁
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @notice 构造函数 - 创建代币时执行一次
     * @dev 初始发行 100 万枚代币给部署者
     */
    constructor() ERC20("FinanceToken", "FTK") Ownable(msg.sender) {
        tokenDescription = "Blockchain Finance Course Experiment Token";
        // 初始铸造 100 万枚代币给合约部署者（即“发行方”）
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @notice 增发代币（仅合约拥有者可调用）
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice 持有者主动销毁自己的代币
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice 查询代币总供应量（人类可读格式）
     */
    function totalSupplyInTokens() public view returns (uint256) {
        return totalSupply() / (10 ** decimals());
    }
}
