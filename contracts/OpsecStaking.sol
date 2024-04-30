// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract OpsecStaking is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;
    using Address for address payable;

    // Struct to store user's staking data
    struct StakeData {
        address user;
        uint256 amount;
        uint256 duration;
        uint256 timestamp;
        bool unstaked;
    }

    // Address of Opsec token
    IERC20 public opsec;

    uint256 private totalStaked;

    // Stake Datas
    mapping(bytes32 => StakeData) public stakes;

    // Amounts by staker
    mapping(address => uint256) public stakeAmounts;

    event Staked(
        bytes32 indexed stakeId,
        address indexed user,
        uint256 amount,
        uint256 duration,
        uint256 timestamp
    );

    event Extended(bytes32 indexed stakeId, uint256 duration);

    event Unstaked(
        bytes32 indexed stakeId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event Claimed(uint256 amount, address indexed user);

    receive() external payable {}

    /**
     * @dev Initializes the contract setting owner and opsec token.
     */
    function initialize(IERC20 _opsec) external initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();

        opsec = _opsec;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev stake opsec to get nodes as reward
     * @param stakeId Identifier of the stake
     * @param amount Amount of opsec
     * @param duration Duration of stake
     */
    function stake(
        bytes32 stakeId,
        uint256 amount,
        uint256 duration
    ) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");

        StakeData storage stakeData = stakes[stakeId];
        require(
            stakes[stakeId].user == address(0),
            "The stakeId is already used"
        );

        opsec.safeTransferFrom(msg.sender, address(this), amount);

        stakeData.user = msg.sender;
        stakeData.amount = amount;
        stakeData.duration = duration;
        stakeData.timestamp = block.timestamp;

        stakeAmounts[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(stakeId, msg.sender, amount, duration, block.timestamp);
    }

    /**
     * @dev extend unlock time
     * @param stakeId Identifier of the stake
     * @param duration Duration of stake
     */
    function extendUnlockTime(
        bytes32 stakeId,
        uint256 duration
    ) external whenNotPaused {
        require(duration > 0, "Amount must be greater than 0");

        StakeData storage stakeData = stakes[stakeId];
        require(stakeData.user == msg.sender, "You are not the staker");
        require(
            stakeData.timestamp + stakeData.duration > block.timestamp,
            "The stake is expired"
        );

        stakeData.duration += duration;

        emit Extended(stakeId, duration);
    }

    /**
     * @dev users can unstake opsec after staking lock
     * @param stakeId Identifier of the stake
     */
    function unstake(bytes32 stakeId) external whenNotPaused {
        StakeData storage stakeData = stakes[stakeId];
        require(stakeData.user == msg.sender, "You are not the staker");
        require(!stakeData.unstaked, "You already unstaked");
        require(
            stakeData.timestamp + stakeData.duration <= block.timestamp,
            "The stake is still locked"
        );

        stakeData.unstaked = true;
        stakeAmounts[msg.sender] -= stakeData.amount;
        totalStaked -= stakeData.amount;

        opsec.safeTransfer(msg.sender, stakeData.amount);

        emit Unstaked(stakeId, msg.sender, stakeData.amount, block.timestamp);
    }

    /**
     * @dev distribute eth to holders
     */
    function claim(
        uint256[] calldata amounts,
        address[] calldata users
    ) external onlyOwner whenNotPaused nonReentrant {
        require(
            amounts.length == users.length,
            "Invalid the length of amounts and users"
        );

        for (uint256 i = 0; i < amounts.length; ) {
            payable(users[i]).sendValue(amounts[i]);

            emit Claimed(amounts[i], users[i]);

            i += 1;
        }
    }

    /**
     * @dev Withdraw tokens.
     * @param token token address
     * @param user user address to withdraw token
     * @param amount token amount to withdraw
     */
    function withdraw(
        address token,
        address user,
        uint256 amount
    ) external onlyOwner {
        if (token == address(opsec)) {
            uint256 maxWithdrawAmount;

            maxWithdrawAmount =
                IERC20(token).balanceOf(address(this)) -
                totalStaked;

            require(
                maxWithdrawAmount >= amount,
                "Insufficient $OPSEC balance to withdraw"
            );
        }

        IERC20(token).safeTransfer(user, amount);
    }
}
